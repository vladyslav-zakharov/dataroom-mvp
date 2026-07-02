import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppShell from '@/components/layout/AppShell'
import DataroomsPage from '@/pages/DataroomsPage'
import DataroomExplorerPage from '@/pages/DataroomExplorerPage'
import { useDataroomStore } from '@/store/useDataroomStore'

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DataroomsPage />} />
        <Route path="/dataroom/:dataroomId" element={<DataroomExplorerPage />} />
        <Route path="/dataroom/:dataroomId/folder/:folderId" element={<DataroomExplorerPage />} />
      </Routes>
    </AppShell>
  )
}

function App() {
  const hydrate = useDataroomStore((s) => s.hydrate)
  const isHydrated = useDataroomStore((s) => s.isHydrated)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <TooltipProvider>
      <BrowserRouter>
        {isHydrated ? (
          <AppRoutes />
        ) : (
          // Minimal loading state while IndexedDB hydrates
          <div className="min-h-svh flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin"
                role="status"
                aria-label="Loading"
              />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          </div>
        )}
      </BrowserRouter>
      <Toaster richColors closeButton />
    </TooltipProvider>
  )
}

export default App
