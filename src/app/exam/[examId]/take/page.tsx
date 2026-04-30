import { Suspense, use } from "react";
import { TakeExamContent } from "@/components/TakeExam/TakeExamContent";

export default function TakeExam({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="screen-loader">
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      }
    >
      <TakeExamContent examId={examId} />
    </Suspense>
  );
}
