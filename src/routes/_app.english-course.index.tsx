import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MonitorPlay, FileText, ListTodo } from "lucide-react";

type YourCourse = {
  title: string;
  image: string;
  duration: string;
  modules: string;
  language: string;
};

type UpcomingCourse = {
  title: string;
  status: string;
  image: string;
  category: string;
  duration: string;
  description: string;
};

type CourseListResponse = {
  yourCourses: YourCourse[];
  upcomingCourses: UpcomingCourse[];
};

type PdfResource = {
  id: string;
  name: string;
  url: string;
};

type Quiz = {
  id: string;
  name: string;
  url: string;
};

export const Route = createFileRoute("/_app/english-course/")({
  component: EnglishCoursePage,
  loader: async () => {
    try {
      const [coursesRes, pdfRes, quizRes] = await Promise.all([
        fetch("https://epowerx-labs-private-limited.github.io/english-speaking/course_list.json"),
        fetch("https://epowerx-labs-private-limited.github.io/english-speaking/pdf/english-ebook-aleena-rais%20150%20page.json"),
        fetch("https://epowerx-labs-private-limited.github.io/english-speaking/quizes/quiz_data.json")
      ]);
      const coursesData: CourseListResponse = await coursesRes.json();
      const pdfData: PdfResource = await pdfRes.json();
      const quizData: Quiz[] = await quizRes.json();
      return { coursesData, pdfData, quizData };
    } catch (e) {
      console.error("Failed to fetch english course data", e);
      return { 
        coursesData: { yourCourses: [], upcomingCourses: [] }, 
        pdfData: null,
        quizData: []
      };
    }
  }
});

function EnglishCoursePage() {
  const { coursesData, pdfData, quizData } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<"courses" | "resources" | "quizzes">("courses");

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Tabs Navigation */}
        <div className="mb-8 grid grid-cols-2 gap-3 border-b border-twilight-navy/10 pb-4 pt-4 sm:flex sm:flex-wrap sm:gap-4 dark:border-periwinkle-sky/10">
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-full px-2 py-2.5 sm:px-5 text-sm font-semibold transition-colors ${
              activeTab === "courses"
                ? "bg-magenta-haze text-white dark:bg-periwinkle-sky dark:text-twilight-navy"
                : "bg-cloud-white text-twilight-navy hover:bg-slate-mist/20 dark:bg-dusk-indigo dark:text-cream-linen dark:hover:bg-secondary"
            }`}
          >
            <MonitorPlay className="h-4 w-4 shrink-0" />
            <span className="truncate">Courses</span>
          </button>
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-full px-2 py-2.5 sm:px-5 text-sm font-semibold transition-colors ${
              activeTab === "quizzes"
                ? "bg-magenta-haze text-white dark:bg-periwinkle-sky dark:text-twilight-navy"
                : "bg-cloud-white text-twilight-navy hover:bg-slate-mist/20 dark:bg-dusk-indigo dark:text-cream-linen dark:hover:bg-secondary"
            }`}
          >
            <ListTodo className="h-4 w-4 shrink-0" />
            <span className="truncate">Quizzes</span>
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-full px-2 py-2.5 sm:px-5 text-sm font-semibold transition-colors ${
              activeTab === "resources"
                ? "bg-magenta-haze text-white dark:bg-periwinkle-sky dark:text-twilight-navy"
                : "bg-cloud-white text-twilight-navy hover:bg-slate-mist/20 dark:bg-dusk-indigo dark:text-cream-linen dark:hover:bg-secondary"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Resources</span>
          </button>
        </div>

        {activeTab === "courses" && (
          <div className="space-y-12">
            {/* Your Courses Section */}
            <section>
              <h2 className="mb-6 text-3xl font-bold text-twilight-navy dark:text-cream-linen inline-block border-b-4 border-periwinkle-sky pb-2">
                Your Courses
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {coursesData.yourCourses.map((course, i) => (
                  <Link
                    key={i}
                    to={`/english-course/${course.title.includes("Bonus") ? "bonus" : "main"}` as any}
                    className="group relative flex flex-col overflow-hidden rounded-[20px] bg-cloud-white transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-dusk-indigo border border-twilight-navy/5 dark:border-periwinkle-sky/10"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#2D333B]">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-[#E3BC65] px-5 py-4 text-sm font-bold text-twilight-navy">
                      <span>{course.duration}</span>
                      <span>{course.modules}</span>
                      <span>{course.language}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Upcoming Courses Section */}
            {coursesData.upcomingCourses.length > 0 && (
              <section>
                <h2 className="mb-6 text-3xl font-bold text-twilight-navy dark:text-cream-linen inline-block border-b-4 border-periwinkle-sky pb-2">
                  Upcoming Courses
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  {coursesData.upcomingCourses.map((course, i) => (
                    <div
                      key={i}
                      className="group relative flex flex-col overflow-hidden rounded-[20px] bg-cloud-white transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-dusk-indigo border border-twilight-navy/5 dark:border-periwinkle-sky/10"
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#2D333B]">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute right-3 top-3">
                          <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-sm border border-white/10">
                            {course.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col p-5">
                        <h3 className="mb-2 text-lg font-bold text-twilight-navy dark:text-cream-linen line-clamp-1">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-slate-mist line-clamp-2">
                            {course.description}
                          </p>
                        )}
                        <div className="mt-4 flex items-center justify-between text-xs font-bold text-twilight-navy/70 dark:text-cream-linen/70">
                          <span>{course.category}</span>
                          <span>{course.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-6">
            <h2 className="mb-6 text-3xl font-bold text-twilight-navy dark:text-cream-linen inline-block border-b-4 border-periwinkle-sky pb-2">
              Additional Resources
            </h2>
            {pdfData ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[20px] border border-twilight-navy/10 bg-cloud-white p-6 shadow-sm dark:border-periwinkle-sky/10 dark:bg-dusk-indigo">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-twilight-navy dark:text-cream-linen line-clamp-2">
                      {pdfData.name}
                    </h3>
                    <p className="text-sm text-slate-mist">PDF Document</p>
                  </div>
                </div>
                <a
                  href={pdfData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto text-center rounded-full bg-magenta-haze px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-magenta-haze/90 dark:bg-periwinkle-sky dark:text-twilight-navy dark:hover:bg-periwinkle-sky/90 shrink-0"
                >
                  Download / View
                </a>
              </div>
            ) : (
              <p className="text-slate-mist">No resources available at the moment.</p>
            )}
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="space-y-6">
            <h2 className="mb-2 text-3xl font-bold text-twilight-navy dark:text-cream-linen inline-block border-b-4 border-periwinkle-sky pb-2">
              Practice Quizzes
            </h2>
            <p className="mb-6 mt-2 text-slate-mist">
              Test your knowledge and practice your English skills with these interactive quizzes.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {quizData.map((quiz) => (
                <a
                  key={quiz.id}
                  href={quiz.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col rounded-[20px] border border-twilight-navy/10 bg-cloud-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-periwinkle-sky/10 dark:bg-dusk-indigo"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-magenta-haze/10 text-magenta-haze dark:bg-periwinkle-sky/20 dark:text-periwinkle-sky">
                    <ListTodo className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 text-xl font-bold text-twilight-navy dark:text-cream-linen group-hover:text-magenta-haze dark:group-hover:text-periwinkle-sky transition-colors">
                    {quiz.name}
                  </h3>
                  <p className="mb-4 text-sm text-slate-mist">Google Form Assessment</p>
                  
                  <div className="mt-auto flex items-center text-sm font-semibold text-magenta-haze dark:text-periwinkle-sky">
                    Start Quiz
                  </div>
                </a>
              ))}
              {quizData.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-mist">
                  No quizzes available at the moment. Check back later!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
