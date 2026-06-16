CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `migration_id` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `product_version` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `pk___ef_migrations_history` PRIMARY KEY (`migration_id`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    ALTER DATABASE CHARACTER SET utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE TABLE `notification_jobs` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `type` varchar(60) CHARACTER SET utf8mb4 NOT NULL,
        `payload` json NOT NULL,
        `status` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `attempts` int NOT NULL,
        `max_attempts` int NOT NULL,
        `available_at` datetime(6) NOT NULL,
        `idempotency_key` varchar(255) CHARACTER SET utf8mb4 NULL,
        `last_error` text CHARACTER SET utf8mb4 NULL,
        `event_id` bigint NULL,
        `locked_at` datetime(6) NULL,
        `locked_by` varchar(80) CHARACTER SET utf8mb4 NULL,
        `created_at` datetime(6) NOT NULL,
        `updated_at` datetime(6) NOT NULL,
        CONSTRAINT `pk_notification_jobs` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE TABLE `notification_logs` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `job_id` bigint NULL,
        `channel` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `recipient` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `subject` varchar(255) CHARACTER SET utf8mb4 NULL,
        `status` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `detail` text CHARACTER SET utf8mb4 NULL,
        `idempotency_key` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
        `created_at` datetime(6) NOT NULL,
        CONSTRAINT `pk_notification_logs` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE TABLE `users` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `email` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `password_hash` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `display_name` varchar(120) CHARACTER SET utf8mb4 NOT NULL,
        `role` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `created_at` datetime(6) NOT NULL,
        `updated_at` datetime(6) NOT NULL,
        CONSTRAINT `pk_users` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE TABLE `events` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
        `description` text CHARACTER SET utf8mb4 NULL,
        `location` varchar(200) CHARACTER SET utf8mb4 NULL,
        `starts_at` datetime(6) NOT NULL,
        `ends_at` datetime(6) NULL,
        `capacity` int NOT NULL,
        `status` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `organizer_id` bigint NOT NULL,
        `created_at` datetime(6) NOT NULL,
        `updated_at` datetime(6) NOT NULL,
        CONSTRAINT `pk_events` PRIMARY KEY (`id`),
        CONSTRAINT `fk_events_users_organizer_id` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE TABLE `registrations` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `event_id` bigint NOT NULL,
        `user_id` bigint NOT NULL,
        `status` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `created_at` datetime(6) NOT NULL,
        `updated_at` datetime(6) NOT NULL,
        CONSTRAINT `pk_registrations` PRIMARY KEY (`id`),
        CONSTRAINT `fk_registrations_events_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
        CONSTRAINT `fk_registrations_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_events_organizer_id` ON `events` (`organizer_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_events_starts_at` ON `events` (`starts_at`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_events_status` ON `events` (`status`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_notification_jobs_event_id` ON `notification_jobs` (`event_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_notification_jobs_idempotency_key` ON `notification_jobs` (`idempotency_key`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_notification_jobs_status_available_at` ON `notification_jobs` (`status`, `available_at`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_notification_logs_idempotency_key` ON `notification_logs` (`idempotency_key`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_registrations_event_id_status` ON `registrations` (`event_id`, `status`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_registrations_event_id_user_id` ON `registrations` (`event_id`, `user_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE INDEX `ix_registrations_user_id` ON `registrations` (`user_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_users_email` ON `users` (`email`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260615151734_InitialCreate') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260615151734_InitialCreate', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260616152241_AddCategoryUrlAndNotifications') THEN

    ALTER TABLE `events` ADD `category` varchar(60) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260616152241_AddCategoryUrlAndNotifications') THEN

    ALTER TABLE `events` ADD `url` varchar(500) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260616152241_AddCategoryUrlAndNotifications') THEN

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

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260616152241_AddCategoryUrlAndNotifications') THEN

    CREATE INDEX `ix_notifications_user_id_created_at` ON `notifications` (`user_id`, `created_at`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260616152241_AddCategoryUrlAndNotifications') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260616152241_AddCategoryUrlAndNotifications', '8.0.13');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

