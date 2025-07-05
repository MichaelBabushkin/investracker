from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os
from typing import Dict, Any
import uuid
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.pdf_processor import PDFProcessor

router = APIRouter()

@router.post("/upload-report")
async def upload_investment_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Upload and process an investment report PDF
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Validate file size (max 10MB)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process PDF
            processor = PDFProcessor()
            extracted_data = processor.process_pdf(temp_file_path)
            
            # Add metadata
            extracted_data['file_info'] = {
                'filename': file.filename,
                'size': len(content),
                'uploaded_by': current_user.id,
                'upload_id': str(uuid.uuid4())
            }
            
            # TODO: Store extracted data in database
            # For now, we'll just return the processed data
            
            return {
                'success': True,
                'message': 'PDF processed successfully',
                'data': extracted_data
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing PDF: {str(e)}"
        )

@router.get("/supported-brokers")
async def get_supported_brokers():
    """
    Get list of supported brokers for PDF processing
    """
    return {
        'brokers': [
            {
                'id': 'fidelity',
                'name': 'Fidelity Investments',
                'supported_reports': ['Portfolio Statement', 'Transaction History']
            },
            {
                'id': 'generic',
                'name': 'Generic/Other',
                'supported_reports': ['Any PDF report (basic extraction)']
            }
        ]
    }

@router.post("/test-extraction")
async def test_pdf_extraction(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test PDF text extraction without full processing
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            processor = PDFProcessor()
            text = processor.extract_text_from_pdf(temp_file_path)
            broker = processor.detect_broker(text)
            
            return {
                'success': True,
                'filename': file.filename,
                'detected_broker': broker,
                'text_length': len(text),
                'text_preview': text[:1000] + "..." if len(text) > 1000 else text
            }
            
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error extracting text from PDF: {str(e)}"
        )
