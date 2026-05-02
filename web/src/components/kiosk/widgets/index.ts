/**
 * Public exports for kiosk widget templates (issue #83).
 *
 * Widgets are pure presentational components: they receive data via props
 * and render uniform card chrome via {@link WidgetFrame}. Pages compose
 * widgets and supply real {@link WidgetMember} projections from the
 * Cozyla hub-foundation roster contract (#82).
 */
export { WidgetFrame, WidgetEmpty } from "./widget-frame";
export { ClockWeatherWidget } from "./clock-weather-widget";
export { NextEventWidget } from "./next-event-widget";
export { AgendaListWidget } from "./agenda-list-widget";
export { WeekCalendarWidget } from "./week-calendar-widget";
export { MealStripWidget } from "./meal-strip-widget";
export { ShoppingWidget } from "./shopping-widget";
export { ChoreBoardWidget } from "./chore-board-widget";
export { RewardsWidget } from "./rewards-widget";
