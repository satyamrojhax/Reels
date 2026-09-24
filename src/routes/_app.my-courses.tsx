import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useEnrolledCourses } from "@/hooks/use-enrolled-courses";
import { Trash2, Compass, PlaySquare } from "lucide-react";

type Course = {
  slug: string;
  courseimage: string;
};

export const Route = createFileRoute("/_app/my-courses")({
  component: MyCoursesPage,
  loader: async () => {
    try {
      const res = await fetch("https://epowerx-labs-private-limited.github.io/TuteDude-Courses-Data/courses.json");
      const json = await res.json();
      return { courses: (json.data?.courses || []) as Course[] };
    } catch (e) {
      console.error("Failed to fetch courses", e);
      return { courses: [] };
    }
  }
});

function MyCoursesPage() {
  const { enrolled, unenroll } = useEnrolledCourses();
  const { courses } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<"skills" | "speaking">("skills");

  const skillsCourses = enrolled.filter(c => c.folder !== "Speaking");
  const speakingCourses = enrolled.filter(c => c.folder === "Speaking");

  const displayCourses = activeTab === "skills" ? skillsCourses : speakingCourses;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold text-twilight-navy dark:text-cream-linen">
          My Courses
        </h1>

        {/* Tabs Navigation */}
        <div className="mb-8 flex flex-wrap gap-4 border-b border-twilight-navy/10 pb-4 dark:border-periwinkle-sky/10">
          <button
            onClick={() => setActiveTab("skills")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "skills"
                ? "bg-magenta-haze text-white dark:bg-periwinkle-sky dark:text-twilight-navy"
                : "bg-cloud-white text-twilight-navy hover:bg-slate-mist/20 dark:bg-dusk-indigo dark:text-cream-linen dark:hover:bg-secondary"
            }`}
          >
            <Compass className="h-4 w-4" />
            Skills
          </button>
          <button
            onClick={() => setActiveTab("speaking")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "speaking"
                ? "bg-magenta-haze text-white dark:bg-periwinkle-sky dark:text-twilight-navy"
                : "bg-cloud-white text-twilight-navy hover:bg-slate-mist/20 dark:bg-dusk-indigo dark:text-cream-linen dark:hover:bg-secondary"
            }`}
          >
            <PlaySquare className="h-4 w-4" />
            Speaking
          </button>
        </div>

        {displayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-twilight-navy/10 bg-cloud-white p-12 text-center shadow-sm dark:border-periwinkle-sky/10 dark:bg-dusk-indigo">
            <h2 className="mb-4 text-xl font-semibold text-twilight-navy dark:text-cream-linen">
              You haven't enrolled in any {activeTab === "skills" ? "skill" : "speaking"} courses yet.
            </h2>
            <Link
              to={activeTab === "skills" ? "/skills" : "/english-course"}
              className="rounded-full bg-magenta-haze px-6 py-2.5 font-medium text-white transition-opacity hover:opacity-90 dark:bg-periwinkle-sky dark:text-twilight-navy"
            >
              Explore {activeTab === "skills" ? "Skills" : "Speaking"} Courses
            </Link>
          </div>
        ) : (
          <div className={
            activeTab === "speaking" 
              ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" 
              : "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          }>
            {displayCourses.map((course) => {
              const fullCourseData = courses.find((c: Course) => c.slug === course.slug);
              const imageUrl = fullCourseData?.courseimage || course.courseimage;
              
              const targetRoute = activeTab === "skills" ? "/course/$slug" : "/english-course/$courseId";
              const targetParams = activeTab === "skills" 
                ? { slug: course.slug } 
                : { courseId: course.slug.replace("english_", "") };
              const targetSearch = activeTab === "skills" ? { folder: course.folder } : undefined;
              
              return (
                <div key={course.slug} className="group relative flex flex-col items-center justify-center overflow-hidden rounded-[20px] border border-magenta-haze/30 bg-cloud-white p-4 text-center transition-all hover:scale-[1.02] hover:shadow-lg dark:border-periwinkle-sky/30 dark:bg-dusk-indigo min-h-[200px]">
                  
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      unenroll(course.slug);
                    }}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-red-200 text-red-600 shadow-sm transition hover:bg-red-50 hover:text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                    title="Unenroll"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Link
                    to={targetRoute as any}
                    params={targetParams as any}
                    search={targetSearch as any}
                    className="flex h-full w-full flex-col items-center justify-center"
                  >
                    <div 
                      className={`mb-3 shrink-0 overflow-hidden rounded-2xl bg-slate-mist/20 text-magenta-haze dark:bg-secondary dark:text-periwinkle-sky ${
                        activeTab === "speaking" ? "aspect-[16/9] w-full" : "h-24 w-24"
                      }`}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={course.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-3xl font-bold">{course.title.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mb-4 line-clamp-2 text-sm font-bold text-magenta-haze dark:text-periwinkle-sky">
                      {course.title}
                    </h3>
                    <div className="mt-auto w-full">
                      <button className="w-full rounded-full bg-magenta-haze py-2 text-sm font-bold text-white transition-colors hover:bg-magenta-haze/90 shadow-sm dark:bg-periwinkle-sky dark:text-twilight-navy">
                        Continue Learning
                      </button>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
