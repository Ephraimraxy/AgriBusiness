import { Link } from "wouter";
import { Bus, Presentation, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">User Registration</h2>
              <p className="text-gray-600">Choose the type of user you want to register</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Staff Registration */}
              <Link href="/staff-registration">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-400 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bus className="text-purple-600" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff</h3>
                    <p className="text-gray-600 text-sm">Register administrative and support staff members</p>
                    <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                      Register Staff
                    </Button>
                  </div>
                </div>
              </Link>

              {/* Resource Person Registration */}
                              <Link href="/resource-person-registration">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-400 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Presentation className="text-amber-600" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Resource Person</h3>
                    <p className="text-gray-600 text-sm">Register trainers and subject matter experts</p>
                    <Button className="w-full mt-4 bg-amber-600 hover:bg-amber-700">
                      Register Resource Person
                    </Button>
                  </div>
                </div>
              </Link>

              {/* Trainee Registration */}
              <Link href="/original/trainee-registration">
                <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-400 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Trainee</h3>
                    <p className="text-gray-600 text-sm">Register new trainees for training programs</p>
                    <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
                      Register Trainee
                    </Button>
                  </div>
                </div>
              </Link>
            </div>

            <div className="text-center mt-8">
              <Link href="/original/home">
                <Button variant="outline" className="bg-gray-600 text-white hover:bg-gray-700">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
