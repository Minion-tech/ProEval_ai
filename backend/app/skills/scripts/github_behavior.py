from typing import Dict, Any
from app.evaluation_heuristics.security_and_compliance.code_quality import CodeQualityHeuristic

def run_github_behavior(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Skill script for 'phase2_execution_monitor'.
    Analyzes GitHub behavior and early code quality signals.
    """
    github_url = data.get("github_url", "")
    
    # 1. Early Quality Analysis
    quality_results = CodeQualityHeuristic.analyze_repository(github_url)
    
    # 2. Simulated Behavior Analysis (e.g., Commit Rhythm)
    # Placeholder for actual GitHub activity polling
    behavior_results = {
        "commit_rhythm": "Healthy",
        "contributor_distribution": "Balanced",
        "late_dump_risk": "Low"
    }
    
    return {
        "quality_metrics": quality_results,
        "behavior_signals": behavior_results,
        "status": quality_results["status"]
    }
