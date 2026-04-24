"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BookOpen, Brain, ClipboardList, Plus, Save, Search, Trash2 } from "lucide-react"

type QuizStats = {
  categories: number
  questions: number
  activeQuestions: number
  attempts: number
  weeklyAttempts: number
  weeklyAverageScore: number
  monthlyAverageScore: number
}

type QuizCategory = {
  slug: string
  name: string
  description: string | null
  isActive: boolean
  totalQuestions: number
  activeQuestions: number
  attempts: number
}

type QuizQuestion = {
  id: string
  categorySlug: string
  question: string
  options: string[]
  correctOption: number
  difficulty: "easy" | "medium" | "hard"
  explanation: string | null
  isActive: boolean
}

const defaultCategoryForm = {
  slug: "",
  name: "",
  description: "",
  isActive: true,
}

const defaultQuestionForm = {
  id: "",
  categorySlug: "",
  question: "",
  options: ["", "", "", ""],
  correctOption: "0",
  difficulty: "easy",
  explanation: "",
  isActive: true,
}

export default function AdminQuizPage() {
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [categories, setCategories] = useState<QuizCategory[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isQuestionLoading, setIsQuestionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState("all")

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [isEditingQuestion, setIsEditingQuestion] = useState(false)

  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm)
  const [questionForm, setQuestionForm] = useState(defaultQuestionForm)

  const loadStats = useCallback(async () => {
    const response = await fetch("/api/admin/quiz/summary", { cache: "no-store" })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error ?? "Failed to load quiz stats")
    }

    setStats(payload.stats ?? null)
  }, [])

  const loadCategories = useCallback(async () => {
    const response = await fetch("/api/admin/quiz/categories", { cache: "no-store" })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error ?? "Failed to load quiz categories")
    }

    setCategories(payload.categories ?? [])
  }, [])

  const loadQuestions = useCallback(async () => {
    setIsQuestionLoading(true)
    const params = new URLSearchParams()

    if (selectedCategoryFilter !== "all") {
      params.set("category", selectedCategoryFilter)
    }

    if (selectedDifficultyFilter !== "all") {
      params.set("difficulty", selectedDifficultyFilter)
    }

    if (search.trim()) {
      params.set("search", search.trim())
    }

    const response = await fetch(`/api/admin/quiz/questions?${params.toString()}`, { cache: "no-store" })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setIsQuestionLoading(false)
      throw new Error(payload?.error ?? "Failed to load quiz questions")
    }

    setQuestions(payload.questions ?? [])
    setIsQuestionLoading(false)
  }, [search, selectedCategoryFilter, selectedDifficultyFilter])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await Promise.all([loadStats(), loadCategories(), loadQuestions()])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quiz manager")
    } finally {
      setIsLoading(false)
    }
  }, [loadCategories, loadQuestions, loadStats])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (isLoading) return

    const timeout = window.setTimeout(() => {
      void loadQuestions().catch((e) => setError(e instanceof Error ? e.message : "Failed to load questions"))
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [isLoading, loadQuestions])

  const categoryOptions = useMemo(() => categories.map((category) => ({ value: category.slug, label: category.name })), [categories])

  const openCreateQuestionDialog = () => {
    setIsEditingQuestion(false)
    setQuestionForm({
      ...defaultQuestionForm,
      categorySlug: categories[0]?.slug ?? "",
    })
    setQuestionDialogOpen(true)
  }

  const saveCategory = async () => {
    if (!categoryForm.slug.trim() || !categoryForm.name.trim()) {
      setError("Category slug and name are required")
      return
    }

    const response = await fetch("/api/admin/quiz/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: categoryForm.slug.trim(),
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        isActive: categoryForm.isActive,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? "Unable to create category")
      return
    }

    setCategoryDialogOpen(false)
    setCategoryForm(defaultCategoryForm)
    await loadAll()
  }

  const updateCategory = async (slug: string, updates: { name?: string; description?: string | null; isActive?: boolean }) => {
    const response = await fetch(`/api/admin/quiz/categories/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? "Unable to update category")
      return
    }

    await loadAll()
  }

  const deleteCategory = async (slug: string) => {
    const confirmed = window.confirm(`Delete category '${slug}'?`)
    if (!confirmed) return

    const response = await fetch(`/api/admin/quiz/categories/${slug}`, { method: "DELETE" })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? "Unable to delete category")
      return
    }

    await loadAll()
  }

  const saveQuestion = async () => {
    if (!questionForm.categorySlug || !questionForm.question.trim()) {
      setError("Question category and question text are required")
      return
    }

    if (questionForm.options.some((opt) => !opt.trim())) {
      setError("All 4 options are required")
      return
    }

    const body = {
      categorySlug: questionForm.categorySlug,
      question: questionForm.question.trim(),
      options: questionForm.options.map((opt) => opt.trim()),
      correctOption: Number(questionForm.correctOption),
      difficulty: questionForm.difficulty,
      explanation: questionForm.explanation.trim() || null,
      isActive: questionForm.isActive,
    }

    const response = await fetch(
      isEditingQuestion ? `/api/admin/quiz/questions/${questionForm.id}` : "/api/admin/quiz/questions",
      {
        method: isEditingQuestion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    )

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? "Unable to save question")
      return
    }

    setQuestionDialogOpen(false)
    setQuestionForm(defaultQuestionForm)
    setIsEditingQuestion(false)
    await loadAll()
  }

  const editQuestion = (question: QuizQuestion) => {
    setIsEditingQuestion(true)
    setQuestionForm({
      id: question.id,
      categorySlug: question.categorySlug,
      question: question.question,
      options: [...question.options],
      correctOption: String(question.correctOption),
      difficulty: question.difficulty,
      explanation: question.explanation ?? "",
      isActive: question.isActive,
    })
    setQuestionDialogOpen(true)
  }

  const deleteQuestion = async (id: string) => {
    const confirmed = window.confirm("Delete this question?")
    if (!confirmed) return

    const response = await fetch(`/api/admin/quiz/questions/${id}`, { method: "DELETE" })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.success) {
      setError(payload?.error ?? "Unable to delete question")
      return
    }

    await loadAll()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Manager</h1>
          <p className="text-muted-foreground">Manage quiz categories, questions, and quality across subjects.</p>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.categories ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Questions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.questions ?? 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.activeQuestions ?? 0} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attempts</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.attempts ?? 0}</p>
            <p className="text-xs text-muted-foreground">{stats?.weeklyAttempts ?? 0} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Save className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.weeklyAverageScore ?? 0}%</p>
            <p className="text-xs text-muted-foreground">Monthly: {stats?.monthlyAverageScore ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Quiz Categories</CardTitle>
                <CardDescription>Activate/deactivate categories and manage names.</CardDescription>
              </div>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                    <DialogDescription>Add a new quiz subject/category.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="category-slug">Slug</Label>
                      <Input
                        id="category-slug"
                        placeholder="example: react-js"
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Name</Label>
                      <Input
                        id="category-name"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-description">Description</Label>
                      <Textarea
                        id="category-description"
                        rows={3}
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch
                        checked={categoryForm.isActive}
                        onCheckedChange={(checked) => setCategoryForm((prev) => ({ ...prev, isActive: checked }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => void saveCategory()}>Create Category</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? <p className="text-sm text-muted-foreground">Loading categories...</p> : null}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.slug}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-xs text-muted-foreground">{category.description || "No description"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{category.slug}</TableCell>
                        <TableCell>{category.activeQuestions}/{category.totalQuestions}</TableCell>
                        <TableCell>{category.attempts}</TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? "default" : "secondary"}>
                            {category.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void updateCategory(category.slug, {
                                  isActive: !category.isActive,
                                })
                              }
                            >
                              {category.isActive ? "Disable" : "Enable"}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => void deleteCategory(category.slug)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Question Bank</CardTitle>
                <CardDescription>Create and edit questions used in quiz attempts.</CardDescription>
              </div>
              <Button onClick={openCreateQuestionDialog} disabled={categories.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search questions"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedDifficultyFilter} onValueChange={setSelectedDifficultyFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isQuestionLoading ? <p className="mb-3 text-sm text-muted-foreground">Loading questions...</p> : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>
                          <p className="font-medium">{question.question}</p>
                          <p className="text-xs text-muted-foreground">Correct: {String.fromCharCode(65 + question.correctOption)}</p>
                        </TableCell>
                        <TableCell>{question.categorySlug}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={question.isActive ? "default" : "secondary"}>
                            {question.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => editQuestion(question)}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => void deleteQuestion(question.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>Provide 4 options and choose the correct answer index.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={questionForm.categorySlug}
                  onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, categorySlug: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={questionForm.difficulty}
                  onValueChange={(value) =>
                    setQuestionForm((prev) => ({ ...prev, difficulty: value as "easy" | "medium" | "hard" }))
                  }
                >
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
            </div>

            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                rows={3}
                value={questionForm.question}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, question: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="space-y-2">
                  <Label>Option {String.fromCharCode(65 + index)}</Label>
                  <Input
                    value={questionForm.options[index]}
                    onChange={(e) => {
                      const next = [...questionForm.options]
                      next[index] = e.target.value
                      setQuestionForm((prev) => ({ ...prev, options: next }))
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Correct Option</Label>
                <Select
                  value={questionForm.correctOption}
                  onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, correctOption: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">A</SelectItem>
                    <SelectItem value="1">B</SelectItem>
                    <SelectItem value="2">C</SelectItem>
                    <SelectItem value="3">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label>Active</Label>
                <Switch
                  checked={questionForm.isActive}
                  onCheckedChange={(checked) => setQuestionForm((prev) => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea
                rows={2}
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void saveQuestion()}>{isEditingQuestion ? "Save Changes" : "Create Question"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
