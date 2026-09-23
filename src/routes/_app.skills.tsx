import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { useEnrolledCourses } from "@/hooks/use-enrolled-courses";

type Course = {
  id: number;
  slug: string;
  title: string;
  price: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  courseimage: string;
};

// Heuristic to map a course to a category/folder
function getCategoryForCourse(title: string, slug: string): string {
  const t = title.toLowerCase();
  const s = slug.toLowerCase();

  const has = (word: string) => t.includes(word) || s.includes(word.replace(/\s+/g, ''));
  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`).test(t) || s.includes(word.replace(/\s+/g, ''));

  if (has("finance") || has("financial") || has("fundamental") || has("technical analysis") || has("risk management")) return "Finance";
  
  if (has("dsa") || has("data structure") || has("competitive programming")) return "DSA & Competitive Programming";
  
  if (has("data") || has("analytics") || has("power bi") || has("tableau") || has("sql") || has("excel")) return "Data Science & Analytics";
  
  if (hasWord("ai") || has("machine learning") || has("deep learning") || has("llm") || has("nlp") || has("genai") || has("generative")) return "AI & ML";
  
  if (has("video") || has("premiere") || has("aftereffects") || has("davinci") || has("vfx") || has("motion graphics")) return "Video Editing & VFX";
  
  if (has("design") || hasWord("ui") || hasWord("ux") || has("photoshop") || has("illustrator") || has("indesign") || has("canva") || has("affinity") || has("blender")) return "Design & UI/UX";
  
  if (has("cyber") || has("security") || has("hacker") || has("ethical hacking")) return "Cyber Security";
  
  if (has("market") || has("seo") || has("copywriting") || has("d2c") || has("growth hacking") || has("content creation") || has("youtube") || has("instagram") || has("ugc")) return "Marketing & Content Creation";
  
  if (has("devops") || has("cloud") || has("aws") || has("docker") || has("kubernetes") || has("terraform") || has("linux") || has("iac") || has("infrastructure")) return "DevOps & Cloud";
  
  if (has("web3") || has("blockchain")) return "Web3 & Blockchain";
  
  if (has("hr management") || has("business")) return "Business & Management";
  
  if (has("game") || has("unity") || has("unreal")) return "Game Development";
  
  // Default fallback
  return "Software Development";
}

export const Route = createFileRoute("/_app/skills")({
  component: SkillsPage,
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

const CATEGORIES = [
  "All",
  "Software Development",
  "Data Science & Analytics",
  "AI & ML",
  "DSA & Competitive Programming",
  "Design & UI/UX",
  "Video Editing & VFX",
  "Marketing & Content Creation",
  "Finance",
  "DevOps & Cloud",
  "Cyber Security",
  "Web3 & Blockchain",
  "Business & Management",
  "Game Development"
];

function SkillsPage() {
  const { courses } = Route.useLoaderData();
  const navigate = useNavigate();
  const { isEnrolled } = useEnrolledCourses();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredCourses = courses.filter((course: Course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const courseCat = getCategoryForCourse(course.title, course.slug);
    const matchesCategory = activeCategory === "All" || courseCat === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header / Search */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-2xl">
            <input
              type="text"
              placeholder="e.g. Machine Learning"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-twilight-navy/20 bg-cloud-white py-3 pl-6 pr-12 text-twilight-navy shadow-sm focus:border-cobalt-pop focus:outline-none dark:border-periwinkle-sky/20 dark:bg-dusk-indigo dark:text-cream-linen"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-magenta-haze p-2 text-white">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="mb-4 flex items-center justify-between md:hidden">
          <h2 className="text-lg font-bold text-twilight-navy dark:text-cream-linen">Categories</h2>
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center gap-2 rounded-full border border-twilight-navy/20 bg-cloud-white px-4 py-2 text-sm font-medium text-twilight-navy shadow-sm transition-colors hover:bg-slate-mist/20 dark:border-periwinkle-sky/20 dark:bg-dusk-indigo dark:text-cream-linen dark:hover:bg-secondary"
          >
            <Filter className="h-4 w-4 shrink-0" />
            <span className="max-w-[140px] truncate">{activeCategory !== "All" ? activeCategory : "All Filters"}</span>
          </button>
        </div>

        {/* Categories (Pills) */}
        <div className={`mb-8 ${showMobileFilters ? 'flex' : 'hidden'} md:flex flex-wrap justify-center gap-2 pb-2 transition-all duration-300`}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setShowMobileFilters(false);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "border-magenta-haze text-magenta-haze dark:border-periwinkle-sky dark:text-periwinkle-sky"
                  : "border-twilight-navy/20 text-twilight-navy hover:bg-slate-mist/20 dark:border-cream-linen/20 dark:text-cream-linen dark:hover:bg-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredCourses.map((course: Course) => {
            const folderName = getCategoryForCourse(course.title, course.slug);
            const userEnrolled = isEnrolled(course.slug);
            return (
              <Link
                key={course.id}
                to="/course/$slug"
                params={{ slug: course.slug }}
                search={{ folder: folderName }}
                className="group relative flex flex-col items-center justify-center overflow-hidden rounded-[20px] border border-magenta-haze/30 bg-cloud-white p-4 transition-all hover:scale-[1.02] hover:shadow-lg dark:border-periwinkle-sky/30 dark:bg-dusk-indigo text-center h-full min-h-[200px]"
              >
                {userEnrolled && (
                  <div className="absolute top-2 right-2 rounded bg-green-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 border border-green-500/20">
                    Enrolled
                  </div>
                )}
                <div className="mb-3 h-24 w-24 shrink-0 overflow-hidden rounded-2xl mt-4">
                  <img
                    src={course.courseimage}
                    alt={course.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="line-clamp-2 text-sm font-bold text-magenta-haze dark:text-periwinkle-sky">
                  {course.title}
                </h3>
              </Link>
            );
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div className="mt-12 text-center text-twilight-navy dark:text-cream-linen">
            No courses found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
