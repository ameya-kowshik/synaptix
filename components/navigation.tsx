"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, LogOut, History, MessageSquare, BookOpen } from "lucide-react"
import { BarChart2 } from "lucide-react"

export function Navigation() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-white">
              AutoLearn
            </Link>
            <div className="w-20 h-8 bg-zinc-800 animate-pulse rounded"></div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-xl font-bold text-white">
            AutoLearn
          </Link>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <Link href="/analytics">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </Link>

                <Link href="/library">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Library
                  </Button>
                </Link>
              
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </Link>
                
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </Link>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <User className="w-4 h-4" />
                    <span>{session.user?.name || session.user?.email}</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-gray-300 hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}