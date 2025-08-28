export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              AI Meeting Contract Bridge
            </h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Beta
            </span>
          </div>
          
          <nav className="flex items-center space-x-6">
            <a href="#" className="text-gray-600 hover:text-gray-900">
              Documentation
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900">
              Support
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

