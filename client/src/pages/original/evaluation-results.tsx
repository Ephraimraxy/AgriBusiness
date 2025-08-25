import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  ArrowLeft,
  BarChart,
  Users,
  Star,
  Activity,
  PieChart,
  Award,
  Calendar,
  Download,
  Filter,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import EvaluationService from "@/lib/evaluationService";

export default function EvaluationResultsPage() {
  const [responses, setResponses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterPerson, setFilterPerson] = useState("");

  const evaluationService = EvaluationService.getInstance();

  useEffect(() => {
    const loadData = () => {
      setResponses(evaluationService.getResponses());
      setStats(evaluationService.getResponseStats());
    };
    loadData();
  }, []);

  const filteredResponses = responses.filter(response => {
    const matchesSearch = response.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.resourcePerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = !filterCourse || response.courseTitle === filterCourse;
    const matchesPerson = !filterPerson || response.resourcePerson === filterPerson;
    
    return matchesSearch && matchesCourse && matchesPerson;
  });

  const uniqueCourses = [...new Set(responses.map(r => r.courseTitle))];
  const uniquePersons = [...new Set(responses.map(r => r.resourcePerson))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/original/home">
                <Button variant="ghost" className="mr-4">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Button>
              </Link>
              <BarChart className="text-2xl text-green-600 mr-3" size={32} />
              <h1 className="text-xl font-semibold text-gray-900">Evaluation Results</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <Download className="mr-2" size={16} />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Evaluation Results Dashboard</h2>
          <p className="text-lg text-gray-600">
            View comprehensive statistics and responses from training evaluations
          </p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-blue-600" size={32} />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {stats.totalResponses || 0}
                </h3>
                <p className="text-gray-600">Total Responses</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-green-600" size={32} />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {stats.averageRating || 0}
                </h3>
                <p className="text-gray-600">Average Rating</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PieChart className="text-purple-600" size={32} />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {uniqueCourses.length}
                </h3>
                <p className="text-gray-600">Courses Evaluated</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-orange-600" size={32} />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {uniquePersons.length}
                </h3>
                <p className="text-gray-600">Resource Persons</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="text-gray-600" size={20} />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search responses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Courses</option>
                  {uniqueCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resource Person</label>
                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Persons</option>
                  {uniquePersons.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCourse("");
                    setFilterPerson("");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="text-blue-600" size={20} />
                Course Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.courseStats || {}).map(([course, count]) => (
                  <div key={course} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{course}</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {count} responses
                    </Badge>
                  </div>
                ))}
                {Object.keys(stats.courseStats || {}).length === 0 && (
                  <p className="text-gray-500 text-center py-4">No course data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="text-green-600" size={20} />
                Resource Person Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.resourcePersonStats || {}).map(([person, count]) => (
                  <div key={person} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{person}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {count} evaluations
                    </Badge>
                  </div>
                ))}
                {Object.keys(stats.resourcePersonStats || {}).length === 0 && (
                  <p className="text-gray-500 text-center py-4">No resource person data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responses List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-purple-600" size={20} />
              Evaluation Responses ({filteredResponses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredResponses.length > 0 ? (
                filteredResponses.map((response) => (
                  <div key={response.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 text-lg">{response.courseTitle}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          {new Date(response.timestamp).toLocaleDateString()}
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {Object.keys(response.responses).length} questions
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Resource Person:</strong> {response.resourcePerson}</p>
                        <p><strong>Date:</strong> {response.date}</p>
                      </div>
                      <div>
                        <p><strong>Response ID:</strong> {response.id}</p>
                        <p><strong>Submitted:</strong> {new Date(response.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                          View Response Details
                        </summary>
                        <div className="mt-2 space-y-2">
                          {Object.entries(response.responses).map(([questionId, answer]) => (
                            <div key={questionId} className="text-sm">
                              <span className="font-medium text-gray-700">Q{questionId}:</span> {answer as string}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart className="text-gray-400" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Responses Found</h3>
                  <p className="text-gray-600">
                    {responses.length === 0 
                      ? "No evaluation responses have been submitted yet."
                      : "No responses match your current filters."
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 