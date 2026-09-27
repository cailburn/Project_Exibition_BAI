from flask import Blueprint, request
from app.services.complaint_service import (
    create_complaint,
    get_all_complaints,
    get_complaint_by_id,
    update_complaint_status,
)
from app.services.customer_service import get_customer_by_id
from app.utils.response import api_response
from app.utils.validation import (
    validate_create_complaint_payload,
    validate_update_complaint_status_payload,
)

complaints_bp = Blueprint("complaints", __name__)


@complaints_bp.route("/complaints", methods=["GET"])
def list_complaints():
    """
    GET /api/complaints
    
    Retrieve all complaints.
    """
    complaints = get_all_complaints()
    data = {
        "complaints": [c.to_dict() for c in complaints],
        "total": len(complaints),
    }
    return api_response(
        data=data,
        message="Complaints retrieved successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )


@complaints_bp.route("/complaints/<complaint_id>", methods=["GET"])
def get_complaint(complaint_id):
    """
    GET /api/complaints/<complaint_id>
    
    Retrieve a single complaint by complaint_id.
    """
    if not complaint_id or not complaint_id.strip():
        return api_response(
            data=None,
            message="Field 'complaint_id' must be a non-empty string",
            success=False,
            is_mock=False,
            status_code=400,
        )

    complaint = get_complaint_by_id(complaint_id.strip())
    if complaint is None:
        return api_response(
            data=None,
            message=f"Complaint with ID '{complaint_id}' not found",
            success=False,
            is_mock=False,
            status_code=404,
        )

    return api_response(
        data=complaint.to_dict(),
        message="Complaint retrieved successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )


@complaints_bp.route("/complaints", methods=["POST"])
def add_complaint():
    """
    POST /api/complaints
    
    Create a new complaint record.
    Required fields: complaint_id, customer_id, complaint_type, description
    Optional field: status
    """
    if not request.is_json:
        return api_response(
            data=None,
            message="Request body must be valid JSON",
            success=False,
            is_mock=False,
            status_code=400,
        )

    payload = request.get_json(silent=True)
    if payload is None or not isinstance(payload, dict):
        return api_response(
            data=None,
            message="Request body must be a valid JSON object",
            success=False,
            is_mock=False,
            status_code=400,
        )

    is_valid, error_msg = validate_create_complaint_payload(payload)
    if not is_valid:
        return api_response(
            data=None,
            message=error_msg,
            success=False,
            is_mock=False,
            status_code=400,
        )

    # Check referenced customer exists
    customer_id = payload["customer_id"].strip()
    customer = get_customer_by_id(customer_id)
    if customer is None:
        return api_response(
            data=None,
            message=f"Customer with ID '{customer_id}' not found",
            success=False,
            is_mock=False,
            status_code=404,
        )

    # Check duplicate complaint_id
    complaint_id = payload["complaint_id"].strip()
    existing_complaint = get_complaint_by_id(complaint_id)
    if existing_complaint is not None:
        return api_response(
            data=None,
            message=f"Complaint with ID '{complaint_id}' already exists",
            success=False,
            is_mock=False,
            status_code=409,
        )

    try:
        new_complaint = create_complaint(payload)
    except Exception as exc:
        return api_response(
            data=None,
            message=f"Failed to create complaint: {str(exc)}",
            success=False,
            is_mock=False,
            status_code=500,
        )

    return api_response(
        data=new_complaint.to_dict(),
        message="Complaint created successfully",
        success=True,
        is_mock=False,
        status_code=201,
    )


@complaints_bp.route("/complaints/<complaint_id>", methods=["PATCH"])
def patch_complaint_status(complaint_id):
    """
    PATCH /api/complaints/<complaint_id>
    
    Update the status of an existing complaint.
    Required field: status
    """
    if not complaint_id or not complaint_id.strip():
        return api_response(
            data=None,
            message="Field 'complaint_id' must be a non-empty string",
            success=False,
            is_mock=False,
            status_code=400,
        )

    if not request.is_json:
        return api_response(
            data=None,
            message="Request body must be valid JSON",
            success=False,
            is_mock=False,
            status_code=400,
        )

    payload = request.get_json(silent=True)
    if payload is None or not isinstance(payload, dict):
        return api_response(
            data=None,
            message="Request body must be a valid JSON object",
            success=False,
            is_mock=False,
            status_code=400,
        )

    complaint = get_complaint_by_id(complaint_id.strip())
    if complaint is None:
        return api_response(
            data=None,
            message=f"Complaint with ID '{complaint_id}' not found",
            success=False,
            is_mock=False,
            status_code=404,
        )


    is_valid, error_msg = validate_update_complaint_status_payload(payload)
    if not is_valid:
        return api_response(
            data=None,
            message=error_msg,
            success=False,
            is_mock=False,
            status_code=400,
        )

    status = payload["status"].strip()
    try:
        updated = update_complaint_status(complaint_id.strip(), status)
    except Exception as exc:
        return api_response(
            data=None,
            message=f"Failed to update complaint: {str(exc)}",
            success=False,
            is_mock=False,
            status_code=500,
        )

    return api_response(
        data=updated.to_dict(),
        message="Complaint status updated successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )
