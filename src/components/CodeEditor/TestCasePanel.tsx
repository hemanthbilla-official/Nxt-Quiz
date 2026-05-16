"use client";

import type {
  ChallengeMode,
  TestCase,
  TestCaseResult,
  RunCodeResponse,
  FunctionTestCase,
  ComponentTestCase,
} from "@/lib/editorTypes";
import { isFunctionTestCase } from "@/lib/editorTypes";

type TestCasePanelProps = {
  challengeMode: ChallengeMode;
  testCases: TestCase[];
  runResults: RunCodeResponse | null;
  isRunning: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
};

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function FunctionTestCaseRow({
  tc,
  result,
}: {
  tc: FunctionTestCase;
  result?: TestCaseResult;
}) {
  return (
    <div className="pe-testCase">
      <div className="pe-testCaseHeader">
        <span className="pe-testCaseName">{tc.name}</span>
        {result && (
          <span
            className={`pe-testBadge ${result.passed ? "pe-testBadgePass" : "pe-testBadgeFail"}`}
          >
            {result.passed ? "✓ Pass" : "✗ Fail"}
          </span>
        )}
      </div>
      <div className="pe-testCaseBody">
        <div className="pe-testRow">
          <span className="pe-testLabel">Input:</span>
          <code className="pe-testValue">
            {(tc.input || []).map(formatValue).join(", ")}
          </code>
        </div>
        {tc.expected !== undefined ? (
          <div className="pe-testRow">
            <span className="pe-testLabel">Expected:</span>
            <code className="pe-testValue">{formatValue(tc.expected)}</code>
          </div>
        ) : (
          <div className="pe-testRow">
            <span className="pe-testLabel">Expected:</span>
            <code className="pe-testValue">Hidden</code>
          </div>
        )}
        {result && (
          <div className="pe-testRow">
            <span className="pe-testLabel">Actual:</span>
            <code
              className={`pe-testValue ${result.passed ? "" : "pe-testValueError"}`}
            >
              {result.error ? `Error: ${result.error}` : formatValue(result.actual)}
            </code>
          </div>
        )}
        {result && result.runtimeMs > 0 && (
          <div className="pe-testRow">
            <span className="pe-testLabel">Time:</span>
            <code className="pe-testValue">{result.runtimeMs}ms</code>
          </div>
        )}
      </div>
    </div>
  );
}

function ComponentTestCaseRow({
  tc,
  result,
}: {
  tc: ComponentTestCase;
  result?: TestCaseResult;
}) {
  return (
    <div className="pe-testCase">
      <div className="pe-testCaseHeader">
        <span className="pe-testCaseName">{tc.name}</span>
        {result && (
          <span
            className={`pe-testBadge ${result.passed ? "pe-testBadgePass" : "pe-testBadgeFail"}`}
          >
            {result.passed ? "✓ Pass" : "✗ Fail"}
          </span>
        )}
      </div>
      <div className="pe-testCaseBody">
        <div className="pe-testRow">
          <span className="pe-testLabel">Props:</span>
          <code className="pe-testValue">
            {JSON.stringify(tc.props || {})}
          </code>
        </div>
        <div className="pe-testRow">
          <span className="pe-testLabel">Must contain:</span>
          <code className="pe-testValue">
            {(tc.expectedContains || []).length > 0
              ? (tc.expectedContains || []).map((s) => `"${s}"`).join(", ")
              : "Hidden"}
          </code>
        </div>
        {tc.expectedElement && (
          <div className="pe-testRow">
            <span className="pe-testLabel">Must use:</span>
            <code className="pe-testValue">&lt;{tc.expectedElement}&gt;</code>
          </div>
        )}
        {result && (
          <div className="pe-testRow">
            <span className="pe-testLabel">Rendered:</span>
            <code
              className={`pe-testValue pe-testValueWrap ${result.passed ? "" : "pe-testValueError"}`}
            >
              {result.error
                ? `Error: ${result.error}`
                : typeof result.actual === "string"
                  ? result.actual.slice(0, 300)
                  : formatValue(result.actual)}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TestCasePanel({
  challengeMode,
  testCases,
  runResults,
  isRunning,
  isCollapsed = false,
  onToggle,
}: TestCasePanelProps) {
  const resultMap = new Map(
    (runResults?.results || []).map((r) => [r.testCaseId, r])
  );

  return (
    <div className={`pe-testPanel ${isCollapsed ? "pe-testPanelCollapsed" : ""}`}>
      <div 
        className="pe-testPanelHeader" 
        onClick={onToggle}
        style={{ cursor: onToggle ? "pointer" : "default" }}
      >
        <div className="pe-testPanelTitleWrap">
          <span className="pe-testToggleIcon">
            {isCollapsed ? "▶" : "▼"}
          </span>
          <h3 className="pe-testPanelTitle">Test Cases</h3>
        </div>
        
        {runResults && (
          <span
            className={`pe-testSummary ${
              runResults.summary.failed === 0
                ? "pe-testSummaryPass"
                : "pe-testSummaryFail"
            }`}
          >
            {runResults.summary.passed}/{runResults.summary.total} passing
          </span>
        )}
        {isRunning && (
          <span className="pe-testSummaryRunning">Running...</span>
        )}
      </div>

      {!isCollapsed && (
        <div className="pe-testCaseList">
          {testCases.map((tc) => {
            const result = resultMap.get(tc.id);

            if (challengeMode === "function" && isFunctionTestCase(tc)) {
              return (
                <FunctionTestCaseRow key={tc.id} tc={tc} result={result} />
              );
            }

            return (
              <ComponentTestCaseRow
                key={tc.id}
                tc={tc as ComponentTestCase}
                result={result}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
