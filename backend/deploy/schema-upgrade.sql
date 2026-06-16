START TRANSACTION;

ALTER TABLE `events` ADD `category` varchar(60) CHARACTER SET utf8mb4 NULL;

ALTER TABLE `events` ADD `url` varchar(500) CHARACTER SET utf8mb4 NULL;

CREATE TABLE `notifications` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `user_id` bigint NOT NULL,
    `type` varchar(60) CHARACTER SET utf8mb4 NOT NULL,
    `event_id` bigint NULL,
    `message` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `is_read` tinyint(1) NOT NULL,
    `created_at` datetime(6) NOT NULL,
    CONSTRAINT `pk_notifications` PRIMARY KEY (`id`),
    CONSTRAINT `fk_notifications_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE INDEX `ix_notifications_user_id_created_at` ON `notifications` (`user_id`, `created_at`);

INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
VALUES ('20260616152241_AddCategoryUrlAndNotifications', '8.0.13');

COMMIT;

