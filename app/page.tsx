"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, Sparkles, AlertCircle } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("flashcards")
  const [textInput, setTextInput] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [count, setCount] = useState("10")
  const [tags, setTags] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    console.log('File selected:', file.name, file.type, file.size)
    
    // Client-side validation
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError("File size must be less than 10MB")
      return
    }

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPDF) {
      setError("Please select a PDF file")
      return
    }

    setIsUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Uploading file to /api/upload...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const data = await response.json()
      console.log('Upload successful, extracted text length:', data.text.length)
      setTextInput(data.text)
      setUploadedFile(file)
      setError("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process PDF file. Please try again."
      setError(errorMessage)
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed')
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected from input:', file.name)
      handleFileUpload(file)
    } else {
      console.log('No file selected')
    }
  }

  const handleButtonClick = () => {
    console.log('Upload button clicked')
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      handleFileUpload(file) // Let handleFileUpload do the validation
    }
  }

  const handleGenerate = async () => {
    if (!textInput.trim()) {
      setError("Please provide some study material or upload a PDF")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const endpoint = activeTab === "flashcards" ? "/api/generate/flashcards" : "/api/generate/quiz"
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: textInput,
          difficulty,
          count: parseInt(count),
          tags: tags.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await response.json()
      router.push(`/results/${data.sessionId}`)
    } catch (err) {
      setError("Failed to generate content. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-end mb-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/history')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Study History
              </Button>
            </div>
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              AutoLearn
            </h1>
            <p className="text-muted-foreground text-lg">
              Transform your study materials into interactive learning tools using AI
            </p>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="flashcards" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Flashcards
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Quiz
              </TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="space-y-6">
                <TabsContent value="flashcards" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold mb-4">Generate Flashcards</h2>
                      <p className="text-muted-foreground mb-6">
                        Upload a PDF or paste your study material to create interactive flashcards
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="quiz" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-semibold mb-4">Generate Quiz</h2>
                      <p className="text-muted-foreground mb-6">
                        Upload a PDF or paste your study material to create multiple-choice quizzes
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* File Upload */}
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Upload PDF File</p>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  {uploadedFile && (
                    <p className="text-sm text-green-600 mb-2">
                      ✓ {uploadedFile.name} uploaded successfully
                    </p>
                  )}
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    id="file-upload"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <Button 
                    variant="outline" 
                    className="cursor-pointer" 
                    disabled={isUploading}
                    onClick={handleButtonClick}
                    type="button"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Processing...
                      </>
                    ) : (
                      "Choose File"
                    )}
                  </Button>
                </div>

                <div className="text-center text-muted-foreground">
                  <span>or</span>
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <Label htmlFor="text-input">Paste Your Study Material</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste your notes, textbook content, or any study material here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>

                {/* Parameters */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Parameters</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="count">
                        Number of {activeTab === "flashcards" ? "Flashcards" : "Questions"}
                      </Label>
                      <Select value={count} onValueChange={setCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Topic Tags (Optional)</Label>
                    <Input
                      id="tags"
                      placeholder="e.g., biology, chemistry, history"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Generate Button */}
                <Button 
                  onClick={handleGenerate} 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading || isUploading || (!textInput.trim())}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {activeTab === "flashcards" ? "Flashcards" : "Quiz"}
                    </>
                  )}
                </Button>
              </div>

              {/* Preview Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Preview</h3>
                  <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
                    {activeTab === "flashcards" ? (
                      <div>
                        <FileText className="h-12 w-12 mx-auto mb-4" />
                        <p>Your generated flashcards will appear here</p>
                      </div>
                    ) : (
                      <div>
                        <FileText className="h-12 w-12 mx-auto mb-4" />
                        <p>Your generated quiz will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
