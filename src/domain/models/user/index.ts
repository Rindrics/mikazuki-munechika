/**
 * User domain model
 *
 * - types.ts: Base type definitions (ユーザー, 評価担当者, etc.)
 * - factory.ts: Factory functions + branded types (認証済ユーザー, etc.)
 *
 * User IDs are hidden using WeakMap pattern.
 * @see ADR 0017 for design rationale
 */
export * from "./types";
export * from "./factory";
