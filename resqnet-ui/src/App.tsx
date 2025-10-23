import './App.css'
import Navbar from './components/Navbar'

// This will be the landing page for the First Responders view. 
// This is a VERY early prototype and will surely be updated as we go.

function App() {
  return (
    <>
      <Navbar />
        <main className="flex flex-col items-center justify-center h-screen bg-linear-to-b from-red-200 to-yellow-300">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Welcome to the Wildfire Response System</h1>
          <p className="max-w-xl text-center text-gray-700 mb-8">
            Click on "Dashboard" in the top-right to view First Responder Dashboard
          </p>
        </main>
    </>
  )
}

export default App
