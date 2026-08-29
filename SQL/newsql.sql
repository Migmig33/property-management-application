-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.21.0.7344
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table db_greenresidences.admin
CREATE TABLE IF NOT EXISTS `admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `password` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.amenity
CREATE TABLE IF NOT EXISTS `amenity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.booking
CREATE TABLE IF NOT EXISTS `booking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Uid` int(11) NOT NULL,
  `guestName` varchar(150) DEFAULT NULL,
  `guestEmail` varchar(150) DEFAULT NULL,
  `guestPhone` varchar(50) DEFAULT NULL,
  `bookingDatetime` datetime DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `cancelReason` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.busy_schedule
CREATE TABLE IF NOT EXISTS `busy_schedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `busyDate` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.co_occupant
CREATE TABLE IF NOT EXISTS `co_occupant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Tid` int(11) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for event db_greenresidences.GenerateMonthlyRent
DELIMITER //
CREATE EVENT `GenerateMonthlyRent` ON SCHEDULE EVERY 1 MONTH STARTS '2026-06-01 00:00:00' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    INSERT INTO payment (Tid, Uid, amount, dueDate, billingPeriod)
    SELECT 
        t.Tid, t.unitId, u.price, 
        DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY), 
        DATE_FORMAT(CURRENT_DATE(), '%M %Y') 
    FROM tenant t
    JOIN unit u ON t.unitId = u.Uid
    WHERE t.status = 'Active'; 
END//
DELIMITER ;

-- Dumping structure for table db_greenresidences.maintenance_request
CREATE TABLE IF NOT EXISTS `maintenance_request` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Uid` int(11) DEFAULT NULL,
  `Tid` int(11) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `priority` varchar(50) DEFAULT NULL,
  `reportedDate` datetime DEFAULT NULL,
  `resolvedDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.occupancy_type
CREATE TABLE IF NOT EXISTS `occupancy_type` (
  `occupancyTypeId` int(11) NOT NULL AUTO_INCREMENT,
  `occupancyType` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`occupancyTypeId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.payment
CREATE TABLE IF NOT EXISTS `payment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Tid` int(11) DEFAULT NULL,
  `Uid` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `dueDate` date DEFAULT NULL,
  `paidDate` date DEFAULT NULL,
  `billingPeriod` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.sms_log
CREATE TABLE IF NOT EXISTS `sms_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Tid` int(11) NOT NULL,
  `message` varchar(500) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `sentAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.tenant
CREATE TABLE IF NOT EXISTS `tenant` (
  `Tid` int(11) NOT NULL AUTO_INCREMENT,
  `tenantNumber` varchar(50) DEFAULT NULL,
  `unitId` int(11) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `leaseStart` date DEFAULT NULL,
  `leaseEnd` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `passwordHash` varchar(255) DEFAULT NULL,
  `occupancyTypeId` int(11) DEFAULT NULL,
  `isTerminated` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`Tid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.tenant_document
CREATE TABLE IF NOT EXISTS `tenant_document` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Tid` int(11) DEFAULT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `fileType` varchar(50) DEFAULT NULL,
  `fileUrl` longtext DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.unit
CREATE TABLE IF NOT EXISTS `unit` (
  `Uid` int(11) NOT NULL AUTO_INCREMENT,
  `unitName` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `beds` varchar(50) DEFAULT NULL,
  `sqm` int(11) DEFAULT NULL,
  `floor` varchar(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `videoUrl` longtext DEFAULT NULL,
  `colorCode` varchar(20) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `maxOccupants` int(11) DEFAULT NULL,
  PRIMARY KEY (`Uid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.unit_amenity
CREATE TABLE IF NOT EXISTS `unit_amenity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Uid` int(11) NOT NULL,
  `amenityId` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table db_greenresidences.unit_image
CREATE TABLE IF NOT EXISTS `unit_image` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Uid` int(11) DEFAULT NULL,
  `imageUrl` longtext NOT NULL,
  `displayOrder` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
