import uuid
import re
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException
from app.db.Models import ProjectSubmission, Evaluation, EvaluationPhase, EvaluationStatus, TeamMembership, StudentAuth, AdminUser
from app.agents.interviewer.agent import InterviewerAgent
from app.services.project_service import ProjectService

class InterviewService:
    @staticmethod
    async def get_interview_context(
        db: AsyncSession,
        submission_id: uuid.UUID,
        current_user: StudentAuth | AdminUser
    ) -> dict:
        """
        Calculates the technical context for an AI interview session.
        Following SOLID: Delegates AI generation to the InterviewerAgent.
        Includes student identity, role, and evaluation history for personalization.
        """
        submission = await ProjectService.get_submission_by_id(db, submission_id)
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # 1. Fetch Student Identity and Role
        student_name = current_user.name
        student_role = "General Team Member"
        student_modules = "Cross-cutting concerns"

        membership_query = select(TeamMembership).where(
            and_(
                TeamMembership.submission_id == submission_id,
                TeamMembership.student_id == current_user.id
            )
        )
        membership_result = await db.execute(membership_query)
        membership = membership_result.scalar_one_or_none()
        if membership:
            student_role = membership.role
            student_modules = membership.modules

        # 2. Gather Phase Evaluations for a complete "story"
        eval_query = select(Evaluation).where(
            Evaluation.submission_id == submission_id
        ).order_by(Evaluation.created_at.asc())
        eval_result = await db.execute(eval_query)
        evaluations = eval_result.scalars().all()
        
        eval_context = []
        for e in evaluations:
            if e.phase == EvaluationPhase.INTERVIEW:
                continue
            # Strip HTML tags for the LLM context
            clean_text = re.sub('<[^<]+?>', '', e.ai_narrative or "")
            eval_context.append(f"[{e.phase.value}] Outcome: {clean_text[:800]}...")

        # 3. Consolidate Project Context
        phase1 = submission.phase_1_data or {}
        phase2 = submission.phase_2_data or {}
        
        project_context = f"""
        INTERVIEWEE: {student_name}
        ROLE: {student_role}
        OWNED MODULES: {student_modules}

        PROJECT TITLE: {phase1.get('title')}
        TECH STACK: {', '.join(phase1.get('tech_stack', []))}
        PROBLEM STATEMENT: {phase1.get('problem_statement')}
        
        HISTORICAL EVALUATIONS:
        {chr(10).join(eval_context)}
        """

        from app.core.rate_limiter import agent_rate_limiter
        
        # 4. Use the specialized agent
        agent = InterviewerAgent()
        
        # Wrapped in the resilient rate limiter to handle bursts gracefully
        result = await agent_rate_limiter.call_with_backoff(
            agent.analyze,
            {
                "project_context": project_context,
                "phase1_title": phase1.get('title', 'their project'),
                "student_name": student_name,
                "student_role": student_role
            }
        )

        
        # Inject identity for frontend UI
        result["student_name"] = student_name
        result["student_role"] = student_role
        
        return result

    @staticmethod
    async def process_interview_results(
        db: AsyncSession,
        submission_id: uuid.UUID,
        payload: dict
    ) -> dict:
        """
        Processes and stores the results of an interview session.
        Supports both direct browser submission and ElevenLabs Webhooks.
        """
        telemetry = payload.get("telemetry", {})
        transcript = payload.get("transcript", "")
        custom_narrative = payload.get("ai_narrative")
        total_score = payload.get("total_score")
        
        # Check if an interview record already exists
        existing_query = select(Evaluation).where(
            and_(
                Evaluation.submission_id == submission_id,
                Evaluation.phase == EvaluationPhase.INTERVIEW
            )
        )
        result = await db.execute(existing_query)
        existing_eval = result.scalar_one_or_none()
        
        look_away = telemetry.get("look_away_percentage", 0)
        
        # Build narrative (Priority: Webhook HTML > Payload Template > Default)
        if custom_narrative:
            narrative = custom_narrative
        elif transcript:
            # Format transcript for simple display if no rich narrative is provided
            safe_transcript = transcript.replace('\n', '<br/>')
            narrative = f"""
            <div style="font-family: 'Segoe UI', sans-serif; padding: 24px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #7c3aed; font-size: 20px; margin-bottom: 12px;">AI Technical Viva Assessment</h2>
                <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <div style="padding: 8px 16px; background: #f5f3ff; border-radius: 8px; color: #7c3aed; font-weight: bold; font-size: 14px;">
                        Integrity Score: {100 - float(look_away)}%
                    </div>
                </div>
                <h3 style="font-size: 16px; color: #1e293b; margin-bottom: 8px;">Session Transcript</h3>
                <div style="background: #f8fafc; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 12px; color: #475569; max-height: 300px; overflow-y: auto; line-height: 1.6;">
                    {safe_transcript}
                </div>
                <p style="margin-top: 16px; font-size: 13px; color: #64748b; font-style: italic;">
                    Detailed multi-agent summary will be available once the AI finishes analyzing the deep technical points.
                </p>
            </div>
            """
        else:
            narrative = f"""
            <div style="font-family: 'Segoe UI', sans-serif; padding: 20px; border-left: 4px solid #7c3aed;">
                <h2 style="color: #5b21b6;">AI Technical Viva Summary</h2>
                <p><strong>Focus Score:</strong> {100 - float(look_away)}% (Based on visual engagement)</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #475569;">The student has completed the conversational assessment. Detailed AI analysis from the transcript is pending.</p>
            </div>
            """

        final_score = round(float(total_score)) if total_score is not None else round(100 - float(look_away))

        if existing_eval:
            existing_eval.ai_narrative = narrative
            existing_eval.total_score = final_score
            existing_eval.status = EvaluationStatus.COMPLETED
            if transcript:
                # Merge logs
                current_logs = existing_eval.agent_logs or []
                current_logs.append({"agent": "ElevenLabsWebhook", "timestamp": datetime.now().isoformat()})
                existing_eval.agent_logs = current_logs
            db.add(existing_eval)
        else:
            new_eval = Evaluation(
                submission_id=submission_id,
                phase=EvaluationPhase.INTERVIEW,
                status=EvaluationStatus.COMPLETED,
                ai_narrative=narrative,
                total_score=final_score,
                agent_logs=[{"agent": "DirectSubmission", "telemetry": telemetry}]
            )
            db.add(new_eval)
        
        await db.commit()

        return {
            "status": "success",
            "message": "Interview results processed and saved.",
            "flags": ["suspicious_gaze"] if float(look_away) > 40 else []
        }
