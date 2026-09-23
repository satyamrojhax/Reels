import { useState, useEffect } from "react";

export type EnrolledCourse = {
  slug: string;
  folder: string;
  title: string;
  enrolledAt: string;
  courseimage?: string;
};

export function useEnrolledCourses() {
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("enrolled_courses");
      if (stored) {
        setEnrolled(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse enrolled courses", e);
    }
  }, []);

  const enroll = (course: EnrolledCourse) => {
    const newEnrolled = [...enrolled, course];
    setEnrolled(newEnrolled);
    localStorage.setItem("enrolled_courses", JSON.stringify(newEnrolled));
  };

  const isEnrolled = (slug: string) => {
    return enrolled.some((c) => c.slug === slug);
  };

  const unenroll = (slug: string) => {
    const newEnrolled = enrolled.filter((c) => c.slug !== slug);
    setEnrolled(newEnrolled);
    localStorage.setItem("enrolled_courses", JSON.stringify(newEnrolled));
  };

  return { enrolled, enroll, unenroll, isEnrolled };
}
