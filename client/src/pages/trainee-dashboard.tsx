import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useContent } from "@/hooks/useContent";
import { useResourcePersons } from "@/hooks/useResourcePersons";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MessageModal from "@/components/message-modal";
import {
  Sprout,
  Video,
  ClipboardCheck,
  Upload,
  TrendingUp,
  Bell,
  User,
  Bed,
  GraduationCap,
  Play,
  CheckCircle,
  FileText,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";
import Header from "@/components/header";
import TraineeVideoDetailsCard from "@/components/trainee-video-details-card";
import TraineeFileDetailsCard from "@/components/trainee-file-details-card";
// Remove unused exam components
import TraineeEvaluation from "@/components/trainee-evaluation";
import TraineeCBTExam from "@/components/trainee-cbt-exam";
import TraineeCBTResults from "@/components/trainee-cbt-results";
import Sidebar, { traineeSidebarItems } from "@/components/sidebar";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useNotifications, useUnreadNotificationCount } from "@/hooks/useNotifications";
import { getTrainees, getMessages, getPublishedEvaluationQuestions, checkTraineeEvaluationSubmission, queryDocuments, TRAINEES_COLLECTION, SPONSORS_COLLECTION, getDocument } from "@/lib/firebaseService";
import { apiRequest } from "@/lib/queryClient";
import type { Trainee, Sponsor } from "@/lib/firebaseService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

function getQueryParam(param: string) {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

export default function TraineeDashboard() {
  const [location, navigate] = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lockSidebarForExam, setLockSidebarForExam] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(() => {
    // If ?videos=1 is present, force videos tab
    if (getQueryParam('videos')) return 'videos';
    // If ?materials=1 is present, force materials tab
    if (getQueryParam('materials')) return 'materials';
    // Remove exam and results query param handling
    // Try to get the initial tab from navigation state
    if (window.history && window.history.state && window.history.state.usr && window.history.state.usr.activeSection) {
      return window.history.state.usr.activeSection;
    }
    return "dashboard";
  });
  const [selectedResourcePerson, setSelectedResourcePerson] = useState<any>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  useEffect(() => {
    // If the user navigates here with a new state or query param, update the tab accordingly
    if (getQueryParam('videos')) {
      setActiveSection('videos');
      return;
    }
    if (getQueryParam('materials')) {
      setActiveSection('materials');
      return;
    }
    // Remove exam and results query param handling
    if (window.history && window.history.state && window.history.state.usr && window.history.state.usr.activeSection) {
      setActiveSection(window.history.state.usr.activeSection);
      return;
    }
    // If coming from video-details, force videos tab
    if (document.referrer && document.referrer.includes('/video-details')) {
      setActiveSection('videos');
    }
  }, [location]);
  const { user } = useAuth();
  // Greeting based on local time (must be declared before any conditional return)
  const [greeting, setGreeting] = useState<string>("");
  const [now, setNow] = useState<Date>(new Date());
  
  useEffect(() => {
    const computeGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
    };
    setGreeting(computeGreeting());
    const timer = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formattedNow = now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const offsetMinutes = -now.getTimezoneOffset();
  const tzSign = offsetMinutes >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMinutes);
  const tzH = String(Math.floor(absMin / 60)).padStart(2, '0');
  const tzM = String(absMin % 60).padStart(2, '0');
  const tzLabel = `GMT${tzSign}${tzH}:${tzM}`;

  // Debug logging for user structure
  console.log('Trainee Dashboard - Full user object:', user);
  console.log('Trainee Dashboard - User trainee:', (user as any)?.trainee);
  console.log('Trainee Dashboard - User displayName:', user?.displayName);

  const { data: announcements } = useAnnouncements((user as any)?.trainee?.sponsorId);
  const { data: content } = useContent((user as any)?.trainee?.sponsorId);
  const { data: resourcePersons, isLoading: loadingResourcePersons, error: resourcePersonsError } = useResourcePersons();

  // Debug logging
  console.log('Resource Persons Data:', resourcePersons);
  console.log('Resource Persons Loading:', loadingResourcePersons);
  console.log('Resource Persons Error:', resourcePersonsError);

  const { data: progress } = useQuery<any[]>({
    queryKey: ["/api/progress", (user as any)?.trainee?.id],
    enabled: !!(user as any)?.trainee?.id,
  });

  // Aggregate metrics for dashboard summary
  const traineeId = (user as any)?.trainee?.id || user?.uid || user?.email || "";
  const { data: notifications } = useNotifications(String(traineeId));
  const { data: unreadCount } = useUnreadNotificationCount(String(traineeId));

  const { data: allTrainees } = useQuery({
    queryKey: ["trainees-summary"],
    queryFn: getTrainees,
  });

  const { data: inboxMessages } = useQuery({
    queryKey: ["messages", String(traineeId)],
    queryFn: () => getMessages(String(traineeId)),
    enabled: Boolean(traineeId),
  });

  // Fetch current trainee record to reflect live tagNumber changes
  const { data: myTraineeRecord } = useQuery<Partial<Trainee> | null>({
    queryKey: ["my-trainee-record", user?.email],
    enabled: !!user?.email,
    refetchInterval: 30000,
    staleTime: 0,
    queryFn: async () => {
      if (!user?.email) return null;
      // Try by email first
      const byEmail = await queryDocuments<Trainee>(TRAINEES_COLLECTION, "email", "==", user.email);
      if (byEmail.length > 0) return byEmail[0];
      // If synthetic phone email, derive phone and try by phone
      if (user.email.endsWith('@phone.cssfarms.local')) {
        const phoneDigits = user.email.split('@')[0];
        const byPhone = await queryDocuments<Trainee>(TRAINEES_COLLECTION, "phone", "==", phoneDigits);
        if (byPhone.length > 0) return byPhone[0];
      }
      return null;
    },
  });

  // Resolve sponsor used during registration → show sponsor name (not just ID)
  const sponsorId = (myTraineeRecord as any)?.sponsorId ?? (user as any)?.trainee?.sponsorId;
  const { data: sponsorDoc } = useQuery<Sponsor | null>({
    queryKey: ["sponsor-doc", sponsorId],
    enabled: Boolean(sponsorId),
    queryFn: async () => {
      if (!sponsorId) return null;
      const doc = await getDocument<Sponsor>(SPONSORS_COLLECTION, sponsorId);
      return doc;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Live counts for exams, evaluations, files, and videos
  const { data: availableExams = [] } = useQuery<any[]>({
    queryKey: ["/api/exams/available"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/exams/available");
      if (!res.ok) throw new Error("Failed to fetch exams");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: evalQuestions = [] } = useQuery<any[]>({
    queryKey: ["published-evaluation-questions-dashboard"],
    queryFn: getPublishedEvaluationQuestions,
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: hasSubmittedEval = false } = useQuery<boolean>({
    queryKey: ["trainee-evaluation-submission-dashboard", user?.uid],
    queryFn: () => checkTraineeEvaluationSubmission(user?.uid || ""),
    enabled: !!user?.uid,
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: filesCount = [] } = useQuery<any[]>({
    queryKey: ["/api/files", "count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: videosCount = [] } = useQuery<any[]>({
    queryKey: ["/api/videos", "count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/videos");
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 0,
  });

  // Fetch trainee exam submissions to compute remaining exams accurately
  const { data: mySubmissions = [] } = useQuery<any[]>({
    queryKey: ["examSubmissions-dashboard", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const qSnap = await getDocs(query(collection(db, "examSubmissions"), where("traineeId", "==", user.uid)));
      return qSnap.docs.map(d => d.data());
    },
    enabled: !!user?.uid,
    refetchInterval: 30000,
    staleTime: 0,
  });

  const submittedExamIds = new Set((mySubmissions || []).map((s: any) => s.examId));
  const remainingExamsCount = (availableExams || []).filter((e: any) => !submittedExamIds.has(e.id)).length;

  // Avoid early returns that would change hooks order; render even if user not ready

  const fallbackTrainee = {
    firstName: user?.displayName?.split(" ")[0] || "",
    lastName: user?.displayName?.split(" ").slice(1).join(" ") || "",
    traineeId: "N/A",
    tagNumber: "N/A",
    roomNumber: "-",
    lectureVenue: "-",
  } as const;

  const traineeObj = (user as any)?.trainee ?? fallbackTrainee;
  const sponsorObj = (user as any)?.sponsor;

  const trainee = traineeObj;
  const sponsor = sponsorObj;
  const traineeName = `${trainee.firstName || ""} ${(trainee as any).surname || trainee.lastName || ""}`.trim() || (user?.displayName || user?.email || "Trainee");

  // Live display fields prefer Firestore record, fallback to auth-attached trainee object
  const displayFirstName = (myTraineeRecord as any)?.firstName ?? trainee.firstName ?? "";
  const displaySurname = (myTraineeRecord as any)?.surname ?? (myTraineeRecord as any)?.lastName ?? (trainee as any)?.surname ?? (trainee as any)?.lastName ?? "";
  const displayRoomBlock = (myTraineeRecord as any)?.roomBlock ?? (trainee as any)?.roomBlock;
  const displayRoomNumber = (myTraineeRecord as any)?.roomNumber ?? (trainee as any)?.roomNumber;
  const displayAllocation: string = (myTraineeRecord as any)?.allocationStatus ?? (trainee as any)?.allocationStatus ?? "pending";
  const resolvedName = (displayFirstName || displaySurname)
    ? `${displayFirstName} ${displaySurname}`.trim()
    : (user?.displayName || "Trainee");

  // Derived content subsets
  const assignments = Array.isArray(content) ? (content as any[]).filter((c: any) => c.type === 'assignment') : [];

  // Fetch roommate(s) tag numbers if any share same room
  const { data: roommates = [] } = useQuery<Trainee[]>({
    queryKey: ["roommates", displayRoomBlock, displayRoomNumber, (myTraineeRecord as any)?.id ?? (trainee as any)?.id ?? user?.uid],
    enabled: Boolean(user && displayRoomBlock && displayRoomNumber),
    refetchInterval: 30000,
    staleTime: 0,
    queryFn: async () => {
      if (!displayRoomBlock || !displayRoomNumber) return [] as any;
      const qSnap = await getDocs(
        query(
          collection(db, "trainees"),
          where("roomBlock", "==", displayRoomBlock),
          where("roomNumber", "==", displayRoomNumber)
        )
      );
      return qSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Trainee[];
    }
  });
  const roommateTags = roommates
    .filter(r => r.id !== (myTraineeRecord as any)?.id && r.id !== (trainee as any)?.id)
    .map(r => r.tagNumber)
    .filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="dashboard-layout-with-fixed-footer">
        <Sidebar 
          activeItem={activeSection} 
          onItemChange={(id) => setActiveSection(id)}
          onCollapseChange={setIsSidebarCollapsed}
          disabled={lockSidebarForExam}
          forceCollapsed={lockSidebarForExam ? true : undefined}
        />

        <main className={cn(
          "main-content-with-fixed-footer p-6",
          isSidebarCollapsed && "collapsed"
        )}>
          {activeSection === "dashboard" && (
            <div className="mb-4 p-4 bg-white rounded-lg border shadow-sm flex items-center justify-between">
              <div className="text-gray-800 text-lg font-semibold">
                {greeting}, {resolvedName}
              </div>
              <div className="text-sm text-gray-600 font-medium tabular-nums">
                {formattedNow} {tzLabel}
              </div>
            </div>
          )}
          {activeSection === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800"><Sprout className="h-5 w-5 text-green-600" /> Overview</CardTitle>
                  <CardDescription>Your training summary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Announcements</div>
                      <div className="text-xl font-semibold">{announcements?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Contents</div>
                      <div className="text-xl font-semibold">{content?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Resource Persons</div>
                      <div className="text-xl font-semibold">{resourcePersons?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Notifications</div>
                      <div className="text-xl font-semibold">{unreadCount ?? 0} unread</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800"><Video className="h-5 w-5 text-blue-600" /> Activity</CardTitle>
                  <CardDescription>Engagement snapshot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Messages</div>
                      <div className="text-xl font-semibold">{inboxMessages?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Progress Entries</div>
                      <div className="text-xl font-semibold">{progress?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Sponsor</div>
                      <div className="text-xl font-semibold">{sponsorDoc?.name || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Tag Number</div>
                      <div className="text-xl font-semibold">{myTraineeRecord?.tagNumber || (user as any)?.trainee?.tagNumber || "pending"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800"><ClipboardCheck className="h-5 w-5 text-emerald-600" /> Status</CardTitle>
                  <CardDescription>Your enrollment details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="font-medium">{displayFirstName} {displaySurname}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Room</span>
                      <span className="font-medium">{displayRoomBlock && displayRoomNumber ? `${displayRoomBlock}-${displayRoomNumber}` : (displayRoomNumber || "-")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Allocation</span>
                      <Badge variant={displayAllocation === 'allocated' ? 'default' : 'secondary'}>
                        {displayAllocation}
                      </Badge>
                    </div>
                    {roommateTags.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Roommate{roommateTags.length > 1 ? 's' : ''}</span>
                        <span className="font-medium">{roommateTags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow xl:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <TrendingUp className="h-5 w-5 text-indigo-600" /> What’s next for you
                  </CardTitle>
                  <CardDescription>Live tasks and materials available now</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>
                      {availableExams.length > 0 ? (
                        <>
                          You have <span className="font-semibold">{remainingExamsCount}</span> of <span className="font-semibold">{availableExams.length}</span> exam{availableExams.length === 1 ? "" : "s"} remaining to take.
                          {remainingExamsCount === 0 && " All available exams have been completed."}
                        </>
                      ) : (
                        <>No exams are currently available.</>
                      )}
                    </li>
                    <li>
                      There {(!hasSubmittedEval && evalQuestions.length > 0 ? 1 : 0) === 1 ? "is" : "are"} <span className="font-semibold">{!hasSubmittedEval && evalQuestions.length > 0 ? 1 : 0}</span> evaluation{(!hasSubmittedEval && evalQuestions.length > 0 ? 1 : 0) === 1 ? "" : "s"} for you to take.
                    </li>
                    <li>
                      There {filesCount.length === 1 ? "is" : "are"} <span className="font-semibold">{filesCount.length}</span> file{filesCount.length === 1 ? "" : "s"} available to view.
                    </li>
                    <li>
                      There {videosCount.length === 1 ? "is" : "are"} <span className="font-semibold">{videosCount.length}</span> video{videosCount.length === 1 ? "" : "s"} available to watch.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
          {activeSection === "videos" && <TraineeVideoDetailsCard />}
          {activeSection === "materials" && <TraineeFileDetailsCard />}
          {activeSection === "cbt-exam" && (
        <TraineeCBTExam 
          traineeId={String(traineeId)}
          traineeName={traineeName}
          traineeEmail={String(trainee?.email || user?.email || "")}
          onExamLockChange={(locked) => setLockSidebarForExam(locked)}
        />
      )}
      {activeSection === "cbt-results" && (
        <TraineeCBTResults 
          traineeId={String(traineeId)}
          traineeName={traineeName}
          traineeEmail={String(trainee?.email || user?.email || "")}
        />
      )}
          {activeSection === "start-evaluation" && <TraineeEvaluation />}
          {activeSection === "assignments" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Assignments</h2>
                  <p className="text-gray-600">Tasks shared by your resource persons and admins</p>
                </div>
              </div>

              {assignments.length === 0 ? (
                <Card className="card-shadow">
                  <CardContent className="py-12 text-center text-gray-600">
                    No assignments from your resource persons or admin. Please check back later.
                  </CardContent>
                </Card>
              ) : (
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle>Available Assignments</CardTitle>
                    <CardDescription>{assignments.length} item{assignments.length === 1 ? '' : 's'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-gray-800">
                      {assignments.map((a: any) => (
                        <li key={a.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-medium">{a.title || 'Untitled assignment'}</div>
                            {a.description && (
                              <div className="text-gray-600 text-xs mt-1 line-clamp-2">{a.description}</div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeSection === "resource-persons" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Resource Persons</h2>
                  <p className="text-gray-600">View and connect with training facilitators and experts</p>
                </div>
                <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white">
                  <User className="mr-2 h-4 w-4" />
                  Contact Resource Person
                </Button>
              </div>
              
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle>Training Facilitators</CardTitle>
                  <CardDescription>Meet the experts guiding your agricultural training journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {loadingResourcePersons ? (
                      <div className="flex items-center justify-center py-12">
                        <CSSFarmsLoader size="md" className="text-gray-400" />
                        <span className="ml-2 text-gray-600">Loading resource persons...</span>
                      </div>
                    ) : resourcePersonsError ? (
                      <div className="text-center py-12">
                        <div className="text-red-500 mb-4">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">Error loading resource persons</p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => window.location.reload()}
                          className="mt-2"
                        >
                          Retry
                        </Button>
                      </div>
                    ) : resourcePersons && resourcePersons.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {resourcePersons.map((rp, index) => {
                          const colors = ['bg-green-100', 'bg-blue-100', 'bg-orange-100', 'bg-purple-100', 'bg-pink-100'];
                          const textColors = ['text-green-600', 'text-blue-600', 'text-orange-600', 'text-purple-600', 'text-pink-600'];
                          const colorIndex = index % colors.length;
                          
                          return (
                            <div key={rp.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                              <div className="flex items-center space-x-4 mb-4">
                                <div className={`w-16 h-16 ${colors[colorIndex]} rounded-full flex items-center justify-center`}>
                                  <User className={`h-8 w-8 ${textColors[colorIndex]}`} />
                                </div>
                                                                 <div>
                                   <h3 className="font-semibold text-gray-800">
                                     {rp.firstName} {rp.surname}
                                   </h3>
                                   <p className="text-sm text-gray-600">
                                     {rp.specialization || 'Agricultural Expert'}
                                   </p>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                {rp.specialization && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Specialization:</span> {rp.specialization}
                                  </p>
                                )}
                                {rp.email && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Contact:</span> {rp.email}
                                  </p>
                                )}
                                                                 {rp.phone && (
                                   <p className="text-sm text-gray-600">
                                     <span className="font-medium">Phone:</span> {rp.phone}
                                   </p>
                                 )}
                                {rp.id && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">ID:</span> {rp.id}
                                  </p>
                                )}
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-4"
                                onClick={() => {
                                  setSelectedResourcePerson(rp);
                                  setIsMessageModalOpen(true);
                                }}
                              >
                                Send Message
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Resource Persons Available</h3>
                        <p className="text-gray-600">There are currently no resource persons registered in the system.</p>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">How to Connect</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Click "Send Message" to contact any resource person</li>
                        <li>• Schedule one-on-one consultation sessions</li>
                        <li>• Join group discussions and Q&A sessions</li>
                        <li>• Access additional learning resources and materials</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "support" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Support Center</h2>
                  <p className="text-gray-600">Get help quickly – contact support or browse resources</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle>Contact Support</CardTitle>
                    <CardDescription>Reach our team for technical or training issues</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-700">
                      • Email: <a className="text-blue-600 hover:underline" href="mailto:support@cssfarms.ng">support@cssfarms.ng</a><br/>
                      • WhatsApp: <a className="text-blue-600 hover:underline" href="https://wa.me/2348012345678" target="_blank" rel="noreferrer">+234 801 234 5678</a><br/>
                      • Hours: Mon–Fri, 9:00–17:00 (WAT)
                    </div>
                    <Button asChild className="bg-green-600 hover:bg-green-700">
                      <a href="mailto:support@cssfarms.ng?subject=ISAC%20Trainee%20Support&body=Describe%20your%20issue%20here...">Email Support</a>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle>Report an Issue</CardTitle>
                    <CardDescription>Create a quick support ticket</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); alert('Thanks! Your issue has been submitted.'); }} className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-700">Subject</label>
                        <input className="w-full mt-1 border rounded p-2 text-sm" placeholder="Short title" required />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Describe your issue</label>
                        <textarea className="w-full mt-1 border rounded p-2 text-sm h-24" placeholder="Include steps and screenshots if possible" required />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Submit</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="card-shadow md:col-span-2">
                  <CardHeader>
                    <CardTitle>Helpful Resources</CardTitle>
                    <CardDescription>Quick answers to common questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>How to take an exam and submit answers</li>
                      <li>Accessing and downloading lecture materials</li>
                      <li>Resolving login or password issues</li>
                      <li>Contacting your resource person</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-[100000] bg-gradient-to-r from-green-200 via-green-50 to-white text-gray-700 py-3 px-6 border-t border-gray-200 shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center justify-center space-x-4">
            <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-5 w-auto" />
            <span className="text-sm font-medium">CSS FARMS Nigeria</span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-gray-500 text-xs">Trainee Dashboard - Agricultural Training Management System</span>
          </div>
        </div>
      </footer>

        {/* Message Modal */}
        {selectedResourcePerson && (
          <MessageModal
            isOpen={isMessageModalOpen}
            onClose={() => {
              setIsMessageModalOpen(false);
              setSelectedResourcePerson(null);
            }}
            resourcePerson={selectedResourcePerson}
          />
        )}
      </div>
    );
  }
