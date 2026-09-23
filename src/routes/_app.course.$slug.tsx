import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useEnrolledCourses } from "@/hooks/use-enrolled-courses";
import { CoursePlayer } from "@/components/course-player";
import { ChevronDown, PlayCircle, FileText, CheckCircle, Trash2 } from "lucide-react";
import { getCoins, set, KEYS } from "@/lib/storage";

type Lecture = {
  type: string;
  name: string;
  lectureId: string;
  lectureLength: string;
  videoUrl: string;
};

type Section = {
  type: "section";
  name: string;
  lectures: Lecture[];
};

type Assignment = {
  type: "assignment";
  name: string;
  assignmentId: string;
  assignmentLink: string;
};

type CourseContent = Section | Assignment;

type CourseDetails = {
  _id: string;
  courseName: string;
  slug: string;
  content: CourseContent[];
};

export const Route = createFileRoute("/_app/course/$slug")({
  component: CourseDetailsPage,
});

function CourseDetailsPage() {
  const { slug } = Route.useParams();
  const search: { folder?: string } = Route.useSearch();
  const { isEnrolled, enroll, unenroll } = useEnrolledCourses();
  
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeVideo, setActiveVideo] = useState<Lecture | null>(null);
  const [completedLectures, setCompletedLectures] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"curriculum" | "assignments">("curriculum");
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true });

  const [showAutoplayCountdown, setShowAutoplayCountdown] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(5);

  const enrolled = isEnrolled(slug);

  useEffect(() => {
    if (!showAutoplayCountdown) return;
    if (autoplayCountdown === 0) {
      if (nextLesson) setActiveVideo(nextLesson);
      setShowAutoplayCountdown(false);
      return;
    }
    const timer = setTimeout(() => setAutoplayCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showAutoplayCountdown, autoplayCountdown]); // nextLesson intentionally omitted from deps to avoid bugs if it changes

  useEffect(() => {
    setShowAutoplayCountdown(false);
  }, [activeVideo]);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const initialFolder = search.folder || "Software Development";
        let res = await fetch(`https://epowerx-labs-private-limited.github.io/TuteDude-Courses-Data/${encodeURIComponent(initialFolder)}/${slug}.json`);
        
        if (!res.ok) {
          // If the UI category folder fails, try the known actual backend folders
          const fallbackFolders = [
            "Software Development",
            "Design",
            "Data Science",
            "AI & ML",
            "DSA",
            "Finance",
            "Management"
          ];
          for (const fb of fallbackFolders) {
            if (fb === initialFolder) continue;
            res = await fetch(`https://epowerx-labs-private-limited.github.io/TuteDude-Courses-Data/${encodeURIComponent(fb)}/${slug}.json`);
            if (res.ok) break;
          }
        }

        if (!res.ok) throw new Error("Course not found");
        const json = await res.json();
        
        if (json.success && json.data) {
          setCourse(json.data);
          
          // load progress
          const savedProgress = localStorage.getItem(`progress_${slug}`);
          if (savedProgress) {
            setCompletedLectures(JSON.parse(savedProgress));
          }
        } else {
          setError("Invalid course data");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [slug, search.folder]);

  // We can fetch the course image from courses.json since it's not in the individual course json
  const [courseImage, setCourseImage] = useState<string>("");
  useEffect(() => {
    fetch("https://epowerx-labs-private-limited.github.io/TuteDude-Courses-Data/courses.json")
      .then(res => res.json())
      .then(json => {
        const c = json.data?.courses?.find((c: any) => c.slug === slug);
        if (c?.courseimage) setCourseImage(c.courseimage);
      })
      .catch(console.error);
  }, [slug]);

  const handleResume = () => {
    if (!course) return;
    let targetLesson: Lecture | null = null;
    const sections = course.content.filter(c => c.type === "section") as Section[];
    
    // Find first uncompleted lesson
    for (const sec of sections) {
      for (const lec of sec.lectures) {
        if (!completedLectures[lec.lectureId]) {
          targetLesson = lec;
          break;
        }
      }
      if (targetLesson) break;
    }
    
    // Fallback to first lesson if all completed
    if (!targetLesson && sections[0]?.lectures[0]) {
      targetLesson = sections[0].lectures[0];
    }
    
    if (targetLesson) {
      setActiveVideo(targetLesson);
    }
  };

  const handleEnroll = () => {
    if (course) {
      enroll({
        slug: course.slug,
        folder: search.folder || "Software Development",
        title: course.courseName,
        enrolledAt: new Date().toISOString()
      });
    }
  };

  const toggleSection = (index: number) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const markCompleted = (lectureId: string) => {
    if (!completedLectures[lectureId]) {
      const currentCoins = getCoins();
      set(KEYS.coins, currentCoins + 10);
    }
    const updated = { ...completedLectures, [lectureId]: true };
    setCompletedLectures(updated);
    localStorage.setItem(`progress_${slug}`, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-magenta-haze border-t-transparent" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-2xl font-bold text-red-500">Error</h2>
        <p className="text-twilight-navy dark:text-cream-linen">{error || "Course not found"}</p>
        <Link to="/skills" className="mt-6 text-magenta-haze underline">Back to Courses</Link>
      </div>
    );
  }

  const sections = course.content.filter(c => c.type === "section") as Section[];
  const assignments = course.content.filter(c => c.type === "assignment") as Assignment[];

  // Find current section and next lesson
  let currentSection: Section | null = null;
  let nextSection: Section | null = null;
  let nextLesson: Lecture | null = null;
  if (enrolled && activeVideo) {
    let foundCurrent = false;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (sec.lectures.some(l => l.lectureId === activeVideo.lectureId)) {
        currentSection = sec;
        if (i + 1 < sections.length) {
          nextSection = sections[i + 1];
        }
      }
      for (const lec of sec.lectures) {
        if (foundCurrent && !nextLesson) {
          nextLesson = lec;
        }
        if (lec.lectureId === activeVideo.lectureId) {
          foundCurrent = true;
        }
      }
    }
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="h-4 md:h-8" />
      
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        {/* Top Header / Hero Section (Hidden when playing a video) */}
        {!activeVideo && (
        <div className="flex flex-col gap-6 md:flex-row md:items-center rounded-3xl bg-cloud-white p-6 shadow-sm border border-twilight-navy/10 dark:bg-dusk-indigo dark:border-periwinkle-sky/10 mb-8 text-center md:text-left">
          <div className="mx-auto md:mx-0 h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-mist/20 shadow-sm border border-twilight-navy/5 dark:border-periwinkle-sky/5">
            {courseImage ? (
              <img src={courseImage} alt={course.courseName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-twilight-navy dark:text-cream-linen">
                {course.courseName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center md:items-start justify-center">
            <h1 className="mb-4 text-3xl font-bold text-twilight-navy md:text-4xl dark:text-cream-linen">
              {course.courseName}
            </h1>
            {!enrolled ? (
              <button
                onClick={handleEnroll}
                className="w-full max-w-sm rounded-full bg-magenta-haze px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 shadow-md shadow-magenta-haze/20"
              >
                Enroll Now for FREE
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                <button
                  onClick={handleResume}
                  className="w-full sm:w-auto rounded-full bg-magenta-haze px-8 py-3 text-lg font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 shadow-md shadow-magenta-haze/20"
                >
                  Resume Learning
                </button>
                <button 
                  onClick={() => unenroll(slug)}
                  className="flex w-fit items-center justify-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500 hover:text-white dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Unenroll
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Video Player Section (Only if enrolled and a video is active) */}
        {enrolled && activeVideo && (
          <div className="mb-10 w-full animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <button 
                onClick={() => setActiveVideo(null)} 
                className="flex items-center gap-1 w-fit shrink-0 text-sm font-medium text-magenta-haze hover:underline dark:text-periwinkle-sky"
              >
                &larr; Back to Curriculum
              </button>
              <h2 className="text-lg font-bold text-twilight-navy md:text-right md:flex-1 line-clamp-2 md:pl-4 dark:text-cream-linen">
                {activeVideo.name}
              </h2>
            </div>
            
            <div className="relative">
              <CoursePlayer 
                videoUrl={activeVideo.videoUrl} 
                title={activeVideo.name}
                onEnded={() => {
                  if (nextLesson) {
                    markCompleted(activeVideo.lectureId);
                    setAutoplayCountdown(5);
                    setShowAutoplayCountdown(true);
                  }
                }}
              />
              
              {showAutoplayCountdown && nextLesson && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl animate-in fade-in">
                  <h3 className="mb-2 text-xl font-bold text-white">Up Next</h3>
                  <p className="mb-6 text-2xl text-cream-linen text-center px-4 line-clamp-2">{nextLesson.name}</p>
                  
                  <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
                    <svg className="absolute h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                      <path
                        className="text-white/20"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        className="text-magenta-haze transition-all duration-1000 ease-linear"
                        strokeDasharray={`${(autoplayCountdown / 5) * 100}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    <span className="text-xl font-bold text-white">{autoplayCountdown}</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowAutoplayCountdown(false)}
                      className="rounded-full bg-white/10 px-6 py-2 font-medium text-white transition-colors hover:bg-white/20"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setActiveVideo(nextLesson!);
                        setShowAutoplayCountdown(false);
                      }}
                      className="flex items-center gap-2 rounded-full bg-magenta-haze px-6 py-2 font-medium text-white transition-colors hover:bg-magenta-haze/90"
                    >
                      Play Now <PlayCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 rounded-2xl border border-twilight-navy/10 bg-cloud-white p-6 shadow-sm dark:border-periwinkle-sky/10 dark:bg-dusk-indigo">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-twilight-navy dark:text-cream-linen">
                    {activeVideo.name}
                  </h2>
                  <p className="mt-1 text-sm text-twilight-navy/80 dark:text-cream-linen/80">
                    Length: {activeVideo.lectureLength}
                  </p>
                </div>
                
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => markCompleted(activeVideo.lectureId)}
                    disabled={completedLectures[activeVideo.lectureId]}
                    className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all ${
                      completedLectures[activeVideo.lectureId] 
                        ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                        : "bg-magenta-haze/10 text-magenta-haze hover:bg-magenta-haze hover:text-white"
                    }`}
                  >
                    <CheckCircle className="h-5 w-5" />
                    {completedLectures[activeVideo.lectureId] ? "Completed" : "Mark as completed"}
                  </button>
                </div>
              </div>

              {/* Current Section Playlist */}
              {currentSection && (
                <div className="mt-8 border-t border-twilight-navy/10 pt-6 dark:border-periwinkle-sky/10">
                  <h3 className="mb-4 text-lg font-bold text-twilight-navy dark:text-cream-linen">
                    Up Next in {currentSection.name}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {currentSection.lectures.map((lecture) => {
                      const isCompleted = completedLectures[lecture.lectureId];
                      const isActive = activeVideo.lectureId === lecture.lectureId;
                      return (
                        <button
                          key={lecture.lectureId}
                          onClick={() => setActiveVideo(lecture)}
                          className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                            isActive 
                              ? "bg-magenta-haze/10 border-magenta-haze/30 border shadow-sm" 
                              : "hover:bg-slate-mist/10 dark:hover:bg-secondary border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <PlayCircle className={`h-5 w-5 shrink-0 ${isActive ? "text-magenta-haze" : "text-twilight-navy/50 dark:text-cream-linen/50"}`} />
                            <span className={`font-medium line-clamp-1 ${isActive ? "text-magenta-haze dark:text-periwinkle-sky" : "text-twilight-navy dark:text-cream-linen"}`}>
                              {lecture.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 pl-4">
                            <span className="text-sm text-twilight-navy/60 dark:text-cream-linen/60">
                              {lecture.lectureLength}
                            </span>
                            {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Suggest Next Section */}
                  {nextSection && nextLesson && (
                    (currentSection.lectures.every(l => completedLectures[l.lectureId]) || 
                     activeVideo.lectureId === currentSection.lectures[currentSection.lectures.length - 1].lectureId)
                  ) && (
                    <div className="mt-6 border-t border-twilight-navy/10 pt-6 dark:border-periwinkle-sky/10 animate-in fade-in slide-in-from-bottom-2">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-twilight-navy/60 dark:text-cream-linen/60">
                        Up Next Section
                      </h3>
                      <button
                        onClick={() => setActiveVideo(nextLesson!)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-twilight-navy p-4 text-lg font-bold text-white transition-transform hover:scale-[1.01] hover:bg-twilight-navy/90 shadow-md dark:bg-periwinkle-sky dark:text-dusk-indigo dark:hover:bg-periwinkle-sky/90"
                      >
                        Start {nextSection.name} <PlayCircle className="h-6 w-6 shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Curriculum Section (Visible to everyone, hidden when video is playing) */}
        {(!enrolled || !activeVideo) && (
        <div className="mb-10">
          <h2 className="mb-6 text-2xl font-bold text-twilight-navy dark:text-cream-linen">
            Course Curriculum
          </h2>
          <div className="flex flex-col gap-4">
            {sections.map((section, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-twilight-navy/10 bg-cloud-white dark:border-periwinkle-sky/10 dark:bg-dusk-indigo">
                <button
                  onClick={() => toggleSection(index)}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-mist/5"
                >
                  <h3 className="text-lg font-bold text-twilight-navy dark:text-cream-linen">
                    {section.name}
                  </h3>
                  <ChevronDown className={`h-5 w-5 text-twilight-navy transition-transform dark:text-cream-linen ${openSections[index] ? "rotate-180" : ""}`} />
                </button>
                
                {openSections[index] && (
                  <div className="border-t border-twilight-navy/10 bg-slate-mist/5 p-2 dark:border-periwinkle-sky/10 dark:bg-dusk-indigo/50">
                    {section.lectures.map((lecture) => {
                      const isCompleted = completedLectures[lecture.lectureId];
                      const isActive = activeVideo?.lectureId === lecture.lectureId;
                      return (
                        <button
                          key={lecture.lectureId}
                          onClick={() => {
                            if (enrolled) setActiveVideo(lecture);
                            // Do nothing if unenrolled. User must use Enroll Now button.
                          }}
                          className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                            isActive 
                              ? "bg-magenta-haze/10 border-magenta-haze/30 border shadow-sm" 
                              : "hover:bg-cloud-white dark:hover:bg-dusk-indigo border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <PlayCircle className={`h-5 w-5 ${isActive ? "text-magenta-haze" : "text-twilight-navy/50 dark:text-cream-linen/50"}`} />
                            <span className={`font-medium ${isActive ? "text-magenta-haze dark:text-periwinkle-sky" : "text-twilight-navy dark:text-cream-linen"}`}>
                              {lecture.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-twilight-navy/60 dark:text-cream-linen/60">
                              {lecture.lectureLength}
                            </span>
                            {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Assignments Section (hidden when video is playing) */}
        {(!enrolled || !activeVideo) && assignments.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-6 text-2xl font-bold text-twilight-navy dark:text-cream-linen">
              Course Assignments & Projects
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {assignments.map((assignment) => (
                <a
                  key={assignment.assignmentId}
                  href={enrolled ? assignment.assignmentLink : "#"}
                  onClick={(e) => {
                    if (!enrolled) {
                      e.preventDefault();
                      // Do nothing, enforce using the main Enroll Now button
                    }
                  }}
                  target={enrolled ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-twilight-navy/10 bg-cloud-white p-5 transition-all hover:-translate-y-1 hover:shadow-md dark:border-periwinkle-sky/10 dark:bg-dusk-indigo"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-magenta-haze/10">
                    <FileText className="h-6 w-6 text-magenta-haze dark:text-periwinkle-sky" />
                  </div>
                  <div>
                    <h4 className="font-bold text-twilight-navy dark:text-cream-linen">
                      {assignment.name}
                    </h4>
                    <span className="text-sm font-medium text-magenta-haze underline dark:text-periwinkle-sky">
                      {enrolled ? "Open Document" : "Enroll to view"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
