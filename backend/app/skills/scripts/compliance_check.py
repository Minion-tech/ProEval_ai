from typing import Dict, Any
from app.evaluation_heuristics.security_and_compliance.code_quality import CodeQualityHeuristic

def run_compliance_check(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Skill script for 'phase3_compliance_audit'.
    It uses the CodeQualityHeuristic to provide deterministic data for the AuditorAgent.
    """
    github_url = data.get("github_url", "")
    
    # 1. Analyze Code Quality via Heuristics
    quality_results = CodeQualityHeuristic.analyze_repository(github_url)
    
    # 2. Check Coverage
    coverage_results = CodeQualityHeuristic.check_coverage()
    
    return {
        "quality_metrics": quality_results,
        "coverage_summary": coverage_results,
        "compliance_status": quality_results["status"]
    }
