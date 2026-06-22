INSERT INTO `admins` (`user_id`, `created_at`)
SELECT `id`, UTC_TIMESTAMP() FROM `users` WHERE `email` = 'admin@school.edu'
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;
