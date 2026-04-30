import type {
  Reporter,
  SerializedError,
  TestCase,
  TestModule,
} from "vitest/reporters";

function hasFailedTests(modules: ReadonlyArray<TestModule>): boolean {
  return modules.some((mod) =>
    mod.children.allTests().some((test) => test.result().state === "failed")
  );
}

export default class CIExitReporter implements Reporter {
  private failed = false;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  private scheduleExit(delay = 30_000) {
    if (process.env.TIDYBOARD_FORCE_VITEST_EXIT !== "1") return;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      process.exit(this.failed ? 1 : 0);
    }, delay);
  }

  onTestCaseResult(testCase: TestCase) {
    if (testCase.result().state === "failed") {
      this.failed = true;
    }
    this.scheduleExit();
  }

  onCoverage() {
    this.scheduleExit(2_500);
  }

  onTestRunEnd(
    modules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<SerializedError>
  ) {
    if (process.env.TIDYBOARD_FORCE_VITEST_EXIT !== "1") return;

    this.failed =
      this.failed ||
      hasFailedTests(modules) ||
      unhandledErrors.length > 0 ||
      Number(process.exitCode ?? 0) !== 0;

    this.scheduleExit(2_500);
  }
}
