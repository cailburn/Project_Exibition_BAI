import pytest
from app import create_app


@pytest.fixture
def app():
    """Create application configured for testing."""
    app = create_app("testing")
    yield app


@pytest.fixture
def client(app):
    """Test client for HTTP requests."""
    return app.test_client()
