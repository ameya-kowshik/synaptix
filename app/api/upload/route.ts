import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'

export async function POST(request: NextRequest) {
  console.log('PDF upload API called')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    console.log('File received:', file ? file.name : 'No file')
    
    if (!file) {
      console.log('No file provided in request')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size)
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Check file type (some browsers might not set the correct MIME type)
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    
    if (!isPDF) {
      console.log('Invalid file type:', file.type, 'filename:', file.name)
      return NextResponse.json(
        { error: `Only PDF files are supported. Received: ${file.type}` },
        { status: 400 }
      )
    }

    console.log('Converting file to buffer...')
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('Buffer created, size:', buffer.length)

    console.log('Extracting text from PDF...')
    // Extract text from PDF
    const data = await pdfParse(buffer)
    const extractedText = data.text
    console.log('Text extracted, length:', extractedText.length, 'pages:', data.numpages)

    if (!extractedText.trim()) {
      console.log('No text could be extracted from PDF')
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 400 }
      )
    }

    console.log('PDF processing successful')
    return NextResponse.json({
      text: extractedText,
      pages: data.numpages,
      filename: file.name
    })

  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { error: `Failed to process PDF file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}