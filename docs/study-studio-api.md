# StudyStudioCore API (version 1)

Pure immutable UMD: `window.StudyStudioCore` / CommonJS. All mutations return a new fully validated record and throw on invalid input; the caller retains the original and rejected raw editor text. No method persists, executes a lab, changes canonical notes/reports, or infers mastery. Context is an optional final argument `{catalog, curriculum, objectives, assessments, learning, competencies}`; defaults use bundled content. `curriculum` may be the `CAMPUS_CONTENT` object or its `.curriculum`.

## Record and references

`emptyRecord()` returns exactly:

```js
{version:1, sequence:0,
 workspace:{mode:'normal',ratio:55,source:'theory',editor:'notes',expanded:'none'},
 cursor:null, activeSessionId:null,
 notebook:[], sessions:[], notebookDraft:null, followupDraft:null,
 settings:{certificationId:null}}
```

`normalize(raw, context?)`: only null/undefined means absent → empty; invalid existing records throw. `validateRecord(raw, context?)` returns a detached validated copy. Unknown keys and versions, unsafe/non-JSON values, duplicate/dangling IDs, invalid real dates and overcapacity are rejected. Maximum serialized UTF-8 size is **180000 bytes**, notebook 24, sessions 12, followups per entry 4, session steps 3. No clipping or history pruning. `sequence` is a nonnegative safe integer shared by `issue-N`, `session-N`, and `followup-N`; removals never decrement it.

Typed reference: `{type:'lesson'|'node'|'objective'|'case'|'exercise'|'question', id:string}`. IDs must exist in the corresponding catalog (question = ProfessionalCore learning question or curriculum quiz question). Null is allowed only where documented.

Cursor: `{ref, step, field, scrollTop, selectionStart, selectionEnd}`. `step` is `theory|practice|quiz|summary|overview|report|reflection`; `field` is `none|notes|answer|reflection|report`; positions are nonnegative integers ≤1000000, selection end ≥start. Lesson supports theory/practice/quiz/summary; case report/overview; node/exercise/question overview/reflection; objective overview; session steps reference their canonical target. No selectors, routes, paths, or text snapshots.

Workspace mode `normal|split`, ratio integer 30–70, source `theory|practice`, editor `notes|answer`, expanded `none|source|editor`.

All timestamps are explicit canonical ISO UTC milliseconds (`2026-11-03T12:00:00.000Z`), ordered creation ≤update ≤end. Review dates use real `YYYY-MM-DD` dates, 2000–2199. `explicitNow(value)` accepts an ISO timestamp or Date and returns canonical UTC; `localDate(now)` formats an explicit instant with local date semantics. No global clock reads.

## Workspace and notebook

```js
updateWorkspace(raw, patch, context?)
rememberLocation(raw, cursorOrNull, context?)
updateSettings(raw, {certificationId}, context?) // null or exact objective catalog ID
setNotebookDraft(raw, issueFieldsOrNull, context?)
addIssue(raw, issueFields, now, context?)
updateIssue(raw, issueId, patch, now, context?)
removeIssue(raw, issueId, context?)
chooseFollowup(raw, issueId, exerciseId, now, context?)
setFollowupDraft(raw, {issueId,response,result,assistance,confidenceAfter}|null, context?)
submitFollowup(raw, issueId, answerFields, now, context?)
```

Issue fields (defaults supplied by add/draft, unknown keys throw): `{kind:'error'|'doubt', sourceRef:null, lessonId:null, nodeId:null, objectiveId:null, prompt:'', explanation:'', cause:'', confidence:null, state:'open', nextReviewDate:null}`. Confidence null or explicit integer 1–5; state `open|review|resolved-declared`. All text fields max 1000 UTF-16 code units, no minimum for drafts; adding requires nonblank prompt and explanation. Cause is the learner's text, never inferred. Created issue adds `{id,createdAt,updatedAt,exerciseId:null,exerciseVersion:null,followups:[]}`. `updateIssue` accepts only issue fields; sourceRef cannot change after creation.

`chooseFollowup` selects a catalog exercise for the linked node/lesson, rejecting the triggering exercise/question and an exercise that lists that source in its `sourceQuestionIds`. Catalog `distinctFrom` means an authored different exercise for those triggers and permits selection. It stores the authored exercise ID/version. `submitFollowup` requires a chosen exercise, nonblank response, explicit result `pending|correct-declared|incorrect-declared|uncertain`, assistance `none-declared|guided|assisted|undeclared`, and nullable explicit confidenceAfter 1–5; saves `{id,exerciseId,exerciseVersion,submittedAt,response,result,assistance,confidenceAfter}`. Maximum response 1000. It clears the matching followup draft, preserves previous submissions and issue state; no automatic evaluation or resolution. Exercise ID/version remain frozen on submitted followups.

## Sessions

```js
createSession(raw, {minutes,lessonId}, now, context?)
checkpointSession(raw, sessionId, {stepId?,cursor?,reflection?}, now, context?)
completeSessionStep(raw, sessionId, stepId, now, context?)
pauseSession(raw, sessionId, now, context?)
resumeSession(raw, sessionId, now, context?)
finishSession(raw, sessionId, now, context?)
removeSession(raw, sessionId, context?)
```

Minutes 30/60/90. Creates running session `{id,createdAt,updatedAt,endedAt:null,minutes,status:'running',stepId:'retrieve',cursor:null,reflection:'',steps}` and makes it active. Existing running session must first be paused/completed. Three frozen steps: `{id:'retrieve',kind:'retrieve',ref:{type:'lesson',id:lessonId},minutes:minutes/3,state:'pending'}`, then `practice` and `reflect` with the same shape and lesson. Step minutes sum exactly to budget. No plan regeneration on normalize/resume, no automatic time advancement. A valid imported plan may use any existing typed reference; IDs/kinds are retrieve/practice/reflect in that order, positive integer minutes summing to budget. Completed blocks explicitly become `done`; finishing requires all three done, records endedAt, clears activeSessionId. Resume merely selects the saved session/cursor. Reflection max 1000. Only running sessions accept checkpoints/block completion. Pausing clears activeSessionId; terminal completed sessions cannot resume. Removal is explicit.

## Read-only projections

```js
prerequisites({study={},record=null,lessonId=null}, context?)
readiness({study={},labs={},certificationId,now,recentDays:30}, context?)
```

`prerequisites` returns `{nodes:[{id,title,lessonIds,prerequisites,relatedActivity,openIssues}],edges:[{from,to}]}`. Activity is declared lesson read/practice status; prerequisites guide without locking.

`readiness` requires an exact objective catalog selection (e.g. `ccst-course`, `security-plus-701`, `security-plus-801`; no aliases/default version). Returns `{asOf,today,recentDays,targetDate,targetElapsed,certificationId,catalogVersion,sourceReviewedAt,provisional,objectives,unmappedEvidence,note}`. Target date comes exclusively from `ProfessionalCore`'s `labs['professional-learning'].settings.targetDate`; missing/invalid is null. Each objective: `{id,title,declaredStatus,relatedLessons,notebookIssues,evidence,nextAction}`. Each evidence item: `{source,id,ref,date,recency,assistance,review,execution,exposed,repeated,autonomousDemonstration,provenance}`. Recency `recent|older|future|unknown`; assistance/review/execution are explicit declarations or unknown. `autonomousDemonstration` can only be true for an exact-mapped submitted assessment with dated nonfuture execution evidence, declared independence, review and no recorded guidance/prior/repeated exposure. It remains a learner declaration, not verified mastery. Documentary transfer cases always remain analysis, never execution. Objective declaration, session completion, notes, quiz repetition and preparation ledger alone cannot establish autonomous demonstration. Ledger competency joins use only catalog `objectiveCrosswalk`, never names/ID similarity. Catalog versions stay separate; unmapped sources remain visible. No readiness score, pass prediction or ready badge.
