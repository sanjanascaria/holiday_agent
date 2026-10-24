import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const trips = sqliteTable('trips', {
 id: text('id').primaryKey(), name: text('name').notNull(), destination: text('destination').notNull(), dates: text('dates').notNull(), owner: text('owner').notNull(), invite: text('invite').notNull().unique(), created: integer('created').notNull(),
});
export const members = sqliteTable('members', {trip: text('trip').notNull().references(()=>trips.id), user: text('user').notNull(), name: text('name').notNull()}, t=>[primaryKey({columns:[t.trip,t.user]})]);
export const messages = sqliteTable('messages', {id:text('id').primaryKey(), trip:text('trip').notNull().references(()=>trips.id), user:text('user').notNull(), name:text('name').notNull(), body:text('body').notNull(), reply:text('reply'), created:integer('created').notNull()});
export const items = sqliteTable('items', {id:text('id').primaryKey(), trip:text('trip').notNull().references(()=>trips.id), title:text('title').notNull(), category:text('category').notNull(), status:text('status').notNull(), notes:text('notes').notNull(), url:text('url').notNull(), source:text('source'), name:text('name').notNull(), review:integer('review').notNull().default(0), version:integer('version').notNull().default(1), created:integer('created').notNull()});
export const revisions = sqliteTable('revisions', {id:text('id').primaryKey(), trip:text('trip').notNull(), item:text('item').notNull(), before:text('before').notNull(), afterVersion:integer('after_version').notNull(), name:text('name').notNull(), created:integer('created').notNull()});

export const sessions = sqliteTable('sessions', { hash:text('hash').primaryKey(), user:text('user').notNull(), name:text('name').notNull(), expires:integer('expires').notNull() });
