def test_health_endpoint(client):
    """Test /api/health returns 200 and accurate system state."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is True  # Real ML model is absent
    assert data["data"]["status"] == "ok"
    assert data["data"]["service"] == "CustomChurn Backend"
    assert data["data"]["ml_model_loaded"] is False
    assert data["data"]["ml_mode"] == "mock"


def test_404_envelope(client):
    """Test unmapped routes return standard envelope with 404."""
    response = client.get("/api/non_existent_route")
    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False
    assert "Endpoint not found" in data["message"]
