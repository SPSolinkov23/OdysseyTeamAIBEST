START TRANSACTION;

ALTER TABLE `users` ADD `organizer_status` varchar(20) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'None';

CREATE TABLE `admins` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `user_id` bigint NOT NULL,
    `created_at` datetime(6) NOT NULL,
    CONSTRAINT `pk_admins` PRIMARY KEY (`id`),
    CONSTRAINT `fk_admins_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE UNIQUE INDEX `ix_admins_user_id` ON `admins` (`user_id`);

INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
VALUES ('20260622205021_AddOrganizerApprovalAndAdmins', '8.0.13');

COMMIT;
