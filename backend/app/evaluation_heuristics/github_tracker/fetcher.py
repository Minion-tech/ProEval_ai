from __future__ import annotations

import io
import tarfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Iterable
from urllib.parse import urlparse

import requests


class GithubCodeFetcherError(Exception):
    """Base exception for GitHub code fetch failures."""


class GithubRepositoryNotFoundError(GithubCodeFetcherError):
    """Raised when the repository cannot be found."""


class GithubUnauthorizedError(GithubCodeFetcherError):
    """Raised when GitHub rejects the request as unauthorized."""


class GithubInvalidRepositoryUrlError(GithubCodeFetcherError):
    """Raised when the provided repository URL is not a valid GitHub repo URL."""


@dataclass(frozen=True)
class GithubRepositoryRef:
    owner: str
    repo: str
    ref: str | None = None


class GithubCodeFetcher:
    """
    Fetches a GitHub repository tarball and returns concatenated source code.

    The archive is processed fully in memory. No files are written to disk.
    """

    API_BASE_URL = "https://api.github.com"
    DEFAULT_TIMEOUT = 60
    MAX_FILE_BYTES = 40_000
    MAX_OUTPUT_CHARS = 80_000
    INCLUDED_EXTENSIONS = {
        ".c",
        ".cc",
        ".cpp",
        ".css",
        ".go",
        ".h",
        ".hpp",
        ".html",
        ".java",
        ".js",
        ".jsx",
        ".kt",
        ".md",
        ".mjs",
        ".py",
        ".rb",
        ".rs",
        ".sh",
        ".sql",
        ".swift",
        ".ts",
        ".tsx",
        ".txt",
        ".vue",
        ".xml",
        ".yaml",
        ".yml",
    }
    EXCLUDED_DIR_NAMES = {
        ".git",
        ".hg",
        ".next",
        ".venv",
        "__pycache__",
        "build",
        "dist",
        "node_modules",
        "target",
        "venv",
    }
    EXCLUDED_FILE_NAMES = {
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "poetry.lock",
    }

    def __init__(
        self,
        *,
        personal_access_token: str | None = None,
        session: requests.Session | None = None,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        self.personal_access_token = personal_access_token
        self.session = session or requests.Session()
        self.timeout = timeout

    def fetch_repository_code(self, repository_url: str) -> str:
        repo_ref = self._parse_repository_url(repository_url)
        archive_bytes = self._download_tarball(repo_ref)
        return self._extract_relevant_code(archive_bytes)

    def _download_tarball(self, repo_ref: GithubRepositoryRef) -> bytes:
        ref_suffix = f"/{repo_ref.ref}" if repo_ref.ref else ""
        tarball_url = f"{self.API_BASE_URL}/repos/{repo_ref.owner}/{repo_ref.repo}/tarball{ref_suffix}"

        response = self.session.get(
            tarball_url,
            headers=self._build_headers(),
            timeout=self.timeout,
            allow_redirects=True,
        )

        if response.status_code == 404:
            raise GithubRepositoryNotFoundError(
                f"Repository '{repo_ref.owner}/{repo_ref.repo}' was not found."
            )
        if response.status_code == 401:
            raise GithubUnauthorizedError("GitHub rejected the request as unauthorized.")
        if response.status_code == 403 and "rate limit" in response.text.lower():
            raise GithubUnauthorizedError(
                "GitHub API rate limit reached or token lacks access to this repository."
            )

        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            raise GithubCodeFetcherError(
                f"GitHub tarball request failed with status {response.status_code}."
            ) from exc

        return response.content

    def _extract_relevant_code(self, archive_bytes: bytes) -> str:
        output_parts: list[str] = []
        total_chars = 0

        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
            for member in archive.getmembers():
                if not member.isfile():
                    continue

                relative_path = self._normalize_member_path(member.name)
                if not relative_path or not self._should_include_file(relative_path):
                    continue

                extracted_file = archive.extractfile(member)
                if extracted_file is None:
                    continue

                raw_bytes = extracted_file.read(self.MAX_FILE_BYTES + 1)
                if len(raw_bytes) > self.MAX_FILE_BYTES:
                    continue

                if self._looks_binary(raw_bytes):
                    continue

                try:
                    content = raw_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    try:
                        content = raw_bytes.decode("utf-8", errors="ignore")
                    except Exception:
                        continue

                formatted = (
                    f"--- FILE: {relative_path} ---\n"
                    f"{content}\n"
                    "--- END OF FILE ---\n"
                )

                if total_chars + len(formatted) > self.MAX_OUTPUT_CHARS:
                    remaining = self.MAX_OUTPUT_CHARS - total_chars
                    if remaining > 0:
                        output_parts.append(formatted[:remaining])
                    break

                output_parts.append(formatted)
                total_chars += len(formatted)

        return "\n".join(output_parts)

    def _build_headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "ProEval-GithubCodeFetcher",
        }
        if self.personal_access_token:
            headers["Authorization"] = f"Bearer {self.personal_access_token}"
        return headers

    def _parse_repository_url(self, repository_url: str) -> GithubRepositoryRef:
        parsed = urlparse(repository_url)
        if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
            raise GithubInvalidRepositoryUrlError("Expected a github.com repository URL.")

        path_parts = [part for part in parsed.path.strip("/").split("/") if part]
        if len(path_parts) < 2:
            raise GithubInvalidRepositoryUrlError("Repository URL must include owner and repo name.")

        owner = path_parts[0]
        repo = path_parts[1].removesuffix(".git")
        ref = self._extract_ref_from_path(path_parts)
        return GithubRepositoryRef(owner=owner, repo=repo, ref=ref)

    def _extract_ref_from_path(self, path_parts: list[str]) -> str | None:
        if len(path_parts) >= 4 and path_parts[2] in {"tree", "blob"}:
            return "/".join(path_parts[3:])
        return None

    def _normalize_member_path(self, member_name: str) -> str:
        path = PurePosixPath(member_name)
        parts = list(path.parts)
        if len(parts) <= 1:
            return ""
        return PurePosixPath(*parts[1:]).as_posix()

    def _should_include_file(self, relative_path: str) -> bool:
        path = PurePosixPath(relative_path)
        if any(part in self.EXCLUDED_DIR_NAMES for part in path.parts[:-1]):
            return False
        if path.name in self.EXCLUDED_FILE_NAMES:
            return False
        return path.suffix.lower() in self.INCLUDED_EXTENSIONS

    def _looks_binary(self, raw_bytes: bytes) -> bool:
        if not raw_bytes:
            return False
        if b"\x00" in raw_bytes:
            return True

        text_byte_whitelist = {7, 8, 9, 10, 12, 13, 27}
        non_text_bytes = sum(
            1
            for byte in raw_bytes
            if byte not in text_byte_whitelist and (byte < 32 or byte > 126)
        )
        return (non_text_bytes / len(raw_bytes)) > 0.30

