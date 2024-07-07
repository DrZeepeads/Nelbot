/**
 * v0 by Vercel.
 * @see https://v0.dev/t/mEphc160VQ3
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Database } from "@/supabase/types"
import {
  IconThumbDownFilled,
  IconThumbUpFilled,
  IconArrowRight
} from "@tabler/icons-react"
import { useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/browser-client"
import { ChatbotUIContext } from "@/context/context"

type Feedback = Database["public"]["Tables"]["feedback"]["Row"]

export default function Component() {
  const [filters, setFilters] = useState({
    sentiment: "all",
    model: "all",
    plugin: "all",
    rag: "all",
    reviewed: "all"
  })

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  const { profile } = useContext(ChatbotUIContext)

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("feedback")
      .select(
        `
        *,
        feedback_reviews (
          id,
          reviewed_by,
          reviewed_at,
          notes
        )
      `
      )
      .order("created_at", { ascending: false })

    console.log(data)

    if (error) {
      console.error("Error fetching feedbacks:", error)
    } else {
      setFeedbacks(data || [])
    }
    setLoading(false)
  }

  const models = useMemo(() => {
    const uniqueModels = [...new Set(feedbacks.map(f => f.model))]
    return uniqueModels
      .filter(model => model !== null)
      .map(model => ({
        value: model,
        label: model,
        count: feedbacks.filter(f => f.model === model).length
      }))
  }, [feedbacks]) as { value: string; label: string; count: number }[]

  const filterOptions = {
    sentiment: [
      {
        value: "good",
        label: "Good",
        count: feedbacks.filter(f => f.feedback === "good").length
      },
      {
        value: "bad",
        label: "Bad",
        count: feedbacks.filter(f => f.feedback === "bad").length
      }
    ],
    model: models,
    plugin: [
      {
        value: "used",
        label: "Plugin Used",
        count: feedbacks.filter(f => f.plugin !== null).length
      },
      {
        value: "not-used",
        label: "No Plugin",
        count: feedbacks.filter(f => f.plugin === null).length
      }
    ],
    rag: [
      {
        value: "used",
        label: "RAG Used",
        count: feedbacks.filter(f => f.rag_used).length
      },
      {
        value: "not-used",
        label: "No RAG",
        count: feedbacks.filter(f => !f.rag_used).length
      }
    ],
    reviewed: [
      {
        value: "true",
        label: "Reviewed",
        count: feedbacks.filter(f => f.feedback_reviews.length > 0).length
      },
      {
        value: "false",
        label: "Not Reviewed",
        count: feedbacks.filter(f => f.feedback_reviews.length === 0).length
      }
    ]
  }

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      if (
        filters.sentiment !== "all" &&
        feedback.feedback !== filters.sentiment
      ) {
        return false
      }
      if (filters.model !== "all" && feedback.model !== filters.model) {
        return false
      }
      if (filters.plugin !== "all") {
        if (filters.plugin === "used" && !feedback.plugin) return false
        if (filters.plugin === "not-used" && feedback.plugin) return false
      }
      if (
        filters.rag !== "all" &&
        feedback.rag_used !== (filters.rag === "used")
      ) {
        return false
      }
      if (
        filters.reviewed !== "all" &&
        feedback.reviewed !== (filters.reviewed === "true")
      ) {
        return false
      }
      return true
    })
  }, [feedbacks, filters])

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]:
        prevFilters[key as keyof typeof prevFilters] === value ? "all" : value
    }))
  }

  const handleReviewToggle = async (id: string) => {
    const feedbackToUpdate = feedbacks.find(f => f.id === id)
    if (!feedbackToUpdate) return

    const { data, error } = await supabase
      .from("feedback")
      .update({ reviewed: !feedbackToUpdate.reviewed })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error updating feedback:", error)
    } else if (data) {
      setFeedbacks(prevFeedbacks =>
        prevFeedbacks.map(f =>
          f.id === id ? { ...f, reviewed: !f.reviewed } : f
        )
      )
    }
  }

  const handleViewDetails = async (id: string) => {
    // Implement the logic to fetch and display details
    console.log(`Viewing details for feedback id: ${id}`)
  }

  if (profile?.role !== "moderator") {
    return <div>You are not allowed to view this page.</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Feedback Reviews</h1>
        <div className="flex items-center space-x-4">
          {Object.entries(filterOptions).map(([key, options]) => (
            <div key={key} className="flex items-center space-x-2">
              {options.map(option => (
                <Button
                  key={option.value}
                  variant={
                    filters[key as keyof typeof filters] === option.value
                      ? "default"
                      : "outline"
                  }
                  className="px-2 py-1 text-xs rounded-full"
                  onClick={() => handleFilterChange(key, option.value)}
                >
                  {option.label}{" "}
                  <span className="text-muted-foreground ml-1">
                    ({option.count})
                  </span>
                </Button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFeedbacks.map(feedback => (
          <Card
            key={feedback.id}
            className="p-4 bg-white dark:bg-gray-800 shadow-md"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                {feedback.feedback === "good" ? (
                  <IconThumbUpFilled className="w-6 h-6 text-green-500" />
                ) : (
                  <IconThumbDownFilled className="w-6 h-6 text-red-500" />
                )}
                <span className="font-medium">{feedback.feedback}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">{feedback.model}</span>
                {feedback.plugin && (
                  <Badge variant="secondary" className="px-2 py-1 text-xs">
                    {feedback.plugin}
                  </Badge>
                )}
                {feedback.rag_used && (
                  <Badge variant="outline" className="px-2 py-1 text-xs">
                    RAG
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground mb-4">{feedback.reason}</p>
            <div className="flex justify-between items-center">
              <Label className="flex items-center space-x-2">
                <Checkbox
                  checked={feedback.reviewed}
                  onCheckedChange={() => handleReviewToggle(feedback.id)}
                />
                <span>Reviewed</span>
              </Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleViewDetails(feedback.id)}
              >
                <IconArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
