import io
import tarfile

from app.evaluation_heuristics.github_tracker import GithubCodeFetcher


class FakeResponse:
    def __init__(self, status_code: int, content: bytes, text: str = "") -> None:
        self.status_code = status_code
        self.content = content
        self.text = text

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


class FakeSession:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.last_headers = None
        self.last_url = None

    def get(self, url, headers=None, timeout=None, allow_redirects=True):
        self.last_url = url
        self.last_headers = headers or {}
        return self.response


def _build_tarball() -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        files = {
            "repo-main/src/app.py": "print('hello world')\n",
            "repo-main/web/index.html": "<h1>Hello</h1>\n",
            "repo-main/node_modules/lib.js": "console.log('skip');\n",
            "repo-main/assets/logo.png": "not really an image but wrong extension",
            "repo-main/__pycache__/cached.pyc": "skip me",
        }
        for path, content in files.items():
            encoded = content.encode("utf-8")
            info = tarfile.TarInfo(name=path)
            info.size = len(encoded)
            archive.addfile(info, io.BytesIO(encoded))
    buffer.seek(0)
    return buffer.read()


def test_fetch_repository_code_filters_and_formats_source_files():
    session = FakeSession(FakeResponse(status_code=200, content=_build_tarball()))
    fetcher = GithubCodeFetcher(personal_access_token="token123", session=session)

    result = fetcher.fetch_repository_code("https://github.com/octocat/hello-world")

    assert session.last_url == "https://api.github.com/repos/octocat/hello-world/tarball"
    assert session.last_headers["Authorization"] == "Bearer token123"
    assert "--- FILE: src/app.py ---" in result
    assert "print('hello world')" in result
    assert "--- FILE: web/index.html ---" in result
    assert "node_modules" not in result
    assert "logo.png" not in result
    assert "__pycache__" not in result
