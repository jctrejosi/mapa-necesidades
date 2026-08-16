-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 15-08-2026 a las 15:39:16
-- Versión del servidor: 10.11.18-MariaDB-cll-lve-log
-- Versión de PHP: 8.4.24

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `mapanece_mapa-necesidades`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `centros_acopio`
--

CREATE TABLE `centros_acopio` (
  `id` int(11) NOT NULL,
  `ciudad` varchar(50) NOT NULL DEFAULT 'manizales',
  `nombre` varchar(150) NOT NULL,
  `organizacion` varchar(150) DEFAULT NULL,
  `es_acopio` tinyint(1) NOT NULL DEFAULT 0,
  `es_sangre` tinyint(1) NOT NULL DEFAULT 0,
  `es_alojamiento` tinyint(1) NOT NULL DEFAULT 0,
  `que_recibe` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `horario` varchar(150) DEFAULT NULL,
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `estado` enum('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `centros_acopio`
--

INSERT INTO `centros_acopio` (`id`, `ciudad`, `nombre`, `organizacion`, `es_acopio`, `es_sangre`, `es_alojamiento`, `que_recibe`, `imagen`, `direccion`, `telefono`, `horario`, `lat`, `lng`, `estado`, `created_at`) VALUES
(1, 'manizales', 'DONACION DE SANGRE', 'Hemocentro del Café', 0, 1, 0, 'Donantes todo tipo de Sangre', 'img_6a7e2c38ef9044.93280423.jpg', 'Canchas Auxiliares', '', '', 5.0581267, -75.4893660, 'abierto', '2026-08-13 19:26:14'),
(2, 'manizales', 'CENTRO DE RECOLECCION', 'Alcaldia de Manizales', 1, 0, 0, 'Agua, no perecederos', 'img_6a7e2322b37e25.49023414.jpg', '', '', '', 5.0560480, -75.4885424, 'abierto', '2026-08-13 19:53:31'),
(3, 'manizales', 'CENTRO DE ACOPIO Y ATENCION', 'Universidad de Caldas', 1, 0, 0, 'Servicios de:\r\nVeterinaria\r\nSalud Mental\r\nAsesoría en Derecho\r\nTransporte de Personas y Víveres\r\nSalud Física\r\nAtención a personas Mayores', 'img_6a7e2dbe149939.17449957.jpg', 'Coliseo - Universidad de Caldas', '', '', 5.0589282, -75.4914721, 'abierto', '2026-08-13 20:49:02'),
(4, 'manizales', 'ALOJAMIENTO TEMPORAL', 'Alcaldía de Manizales', 0, 0, 1, 'Para personas afectadas', NULL, 'Coliseo Mayor', '', '', 5.0579573, -75.4884548, 'abierto', '2026-08-13 20:52:21'),
(5, 'manizales', 'Crus Roja Seccional Caldas', 'Cruz Roja Colombianas', 1, 0, 0, 'No perecederos, kit alimentacion, kit de aseo, linternas', 'img_6a7e7ce219d400.38183488.jpg', '', '', '', 5.0508187, -75.4820526, 'abierto', '2026-08-14 02:26:42'),
(6, 'manizales', 'Hemocentro del Café', 'Cruz Roja Colombiana', 0, 1, 0, 'Sangre tipo O- y O+', 'img_6a7e7d50218955.01035113.jpg', '', '', '', 5.0515561, -75.4824495, 'abierto', '2026-08-14 02:28:32');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contactos`
--

CREATE TABLE `contactos` (
  `id` int(11) NOT NULL,
  `sector_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `rol` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `contactos`
--

INSERT INTO `contactos` (`id`, `sector_id`, `nombre`, `telefono`, `rol`, `created_at`) VALUES
(1, 2, 'Guadalupe Nieto', '3246219748', 'Comunitario', '2026-08-13 18:42:04'),
(2, 3, 'Laura osorio', '3206468556', 'Voluntariado chocolaton', '2026-08-13 19:02:14'),
(3, 4, 'Gladys', '311 7313628', '', '2026-08-13 19:03:41'),
(4, 5, 'Paulina Ospina', '311 7313628', '', '2026-08-13 19:10:54'),
(5, 6, 'Jimmy', '3147268175', 'Líder', '2026-08-13 19:13:20'),
(6, 7, 'Mariana Quintero', '3205585485', 'encargada', '2026-08-13 19:21:17'),
(7, 8, 'Anonimo', '', '', '2026-08-13 19:31:59'),
(8, 9, 'Yaniret Cruz Gutierrez', '3103922770', 'cabeza de familia', '2026-08-13 19:51:37'),
(9, 10, 'Camilo Muñoz', '3212957500', 'Lider', '2026-08-13 20:01:42'),
(10, 11, 'Alejandra', 'CALLE 62 #1A -9', '', '2026-08-13 20:06:02'),
(11, 12, 'Maria del Mar', '3229722734', '', '2026-08-13 20:18:05'),
(12, 13, 'Maria Camila Marin', '3244774810', 'encargada', '2026-08-13 20:58:00'),
(13, 14, 'Angel', '3046147314', 'Encargado', '2026-08-13 21:24:37'),
(14, 15, 'Punto de acopio confirmado', '', '', '2026-08-13 21:56:53'),
(15, 16, 'Leidy', '3103992922', '', '2026-08-13 22:09:35'),
(16, 17, 'Amanda Loaiza', '3177981191', 'vecina del sector', '2026-08-13 22:20:41'),
(17, 18, 'Junta de acción comunal Topacio', '', '', '2026-08-13 22:31:20'),
(18, 19, 'M cuidador de Sebastián Valencia', '3123669785', 'Cuidadora', '2026-08-13 23:43:56'),
(19, 20, 'M cuidador de Sebastián Valencia', '3123669785', 'Cuidadora', '2026-08-13 23:43:58'),
(20, 21, 'Banny Jaramillo', '3103612586', 'Principal afectada', '2026-08-14 03:28:35'),
(21, 22, 'Manuela duque', '3183049437', '', '2026-08-14 03:32:29'),
(22, 23, 'Olga Uribe', '3003544440', 'vecina', '2026-08-14 17:14:33'),
(23, 24, 'Olga Uribe', '3003544440', 'vecina', '2026-08-14 17:14:35'),
(24, 25, 'Leidy Ortiz Ocampo', '3022060845', 'Líder del refugio', '2026-08-14 17:45:32'),
(25, 26, 'Leidy Ortiz Ocampo', '3022060845', 'Líder del refugio', '2026-08-14 17:45:39'),
(26, 27, 'Leidy Ortiz Ocampo', '3022060845', 'Líder del refugio', '2026-08-14 17:45:39'),
(27, 28, 'Carlos Andrés López Castaño', '3224790694', 'Habitante del municipio', '2026-08-14 18:14:45'),
(28, 29, 'Mónica Arenas Montes', '3215182803', '', '2026-08-14 19:08:59'),
(29, 30, 'Jairo López ministerio de interior', '3154195166', 'Ministerio de Interior', '2026-08-14 20:09:39'),
(30, 31, 'wilmar echeverry', '3103817213', 'Desarrollador de la APP', '2026-08-13 03:55:42'),
(31, 32, 'Anónimo', '3115163636', 'Líder de comunidad', '2026-08-13 04:30:17'),
(32, 33, 'Andres Herrera', '315 875 5086', 'lider', '2026-08-13 04:39:05'),
(33, 34, 'Gloria ruda', '3205433644', 'Hija', '2026-08-13 05:02:39'),
(34, 35, 'Hemocentro del Café', '', '', '2026-08-13 05:15:51'),
(35, 36, 'Valeria Villamil', '3146147498', 'Voluntaria', '2026-08-13 05:27:10'),
(36, 37, 'Anónimo', '', '', '2026-08-13 05:27:22'),
(37, 38, 'Fundación angelitos de la calle', '3176560345', 'Líder comunitario', '2026-08-13 05:32:56'),
(38, 39, 'DIANA HURTADO', '3207010114', 'Lider ambiental', '2026-08-13 05:37:38'),
(39, 40, 'Camila', '310 4074525', 'Líder comunitaria', '2026-08-13 05:40:39'),
(40, 41, 'Angela Arango', '3104518699', 'Familiar', '2026-08-13 05:45:35'),
(41, 42, 'Alejandra Martínez', '3127444490', 'Operaria secretaria de desarrollo social', '2026-08-13 06:13:47'),
(42, 43, 'FAMA', '', '', '2026-08-13 06:15:52'),
(43, 44, 'Natalia Llanos', '3177862240', 'Copropietario', '2026-08-13 06:38:10'),
(44, 45, 'Centro de Acopio U. de Caldas.', '', '', '2026-08-13 06:39:18'),
(45, 46, 'Cindy', '321 7004750', 'Dueña de la casa', '2026-08-13 06:55:48'),
(46, 47, 'Leidy', '3103992922', '', '2026-08-13 07:00:06'),
(47, 48, 'Manuela Moreno', '3113957886', 'Líder de familia', '2026-08-13 07:02:04'),
(48, 49, 'Bernardo Marín', '3147294337', '', '2026-08-13 07:04:48'),
(49, 50, 'Sonia y Alejandra castaño', '3135298779. /3117054487', 'lider y ayudante', '2026-08-13 09:00:34'),
(50, 51, 'Valeria Galarza Salazar', '3205399376', '', '2026-08-13 09:10:03'),
(51, 52, 'Edwin castro', '3137339269', 'Vecino', '2026-08-13 14:48:14'),
(52, 53, 'Luis Felipe López', '3148263064', 'Habitante Edificio', '2026-08-13 15:25:32'),
(53, 54, 'Luis Felipe López', '3148263064', 'Habitante Edificio', '2026-08-13 15:25:33'),
(54, 55, 'Andrés López Jaramillo', '3196172822', 'Habitante damnificado', '2026-08-13 16:35:03'),
(55, 56, 'German,', '', 'Lider comunitario', '2026-08-13 16:55:34'),
(56, 57, 'Yaneth Cardona', '321 6226364', 'Lider comunitaria', '2026-08-13 16:57:34'),
(57, 58, 'María Fernanda Loaiza', '312 7902213', 'Familiar de personas damnificadas en la zona', '2026-08-13 16:57:55'),
(58, 59, 'Michelle Andrea giraldo', '3227409806', 'Mamá soltera', '2026-08-13 17:04:14'),
(59, 60, 'Carmen maria morales', '3016368780', 'Afectado', '2026-08-13 18:28:59'),
(60, 61, 'Deiker Javier Serrano', '3207103769', 'Afectado', '2026-08-13 18:31:13'),
(61, 62, 'Lina', '3103417000', 'Ayudante', '2026-08-13 18:31:57'),
(62, 63, 'Socorro Martinez', '3116057749', 'Afectados', '2026-08-13 18:34:53'),
(63, 64, 'Arabelly Calle Casas', '3142249720', 'Afectado', '2026-08-13 18:43:41'),
(64, 65, 'Laura Vanessa López Villa', '3017843982', 'Lider de la familia', '2026-08-13 18:49:38'),
(65, 66, 'Rosa Iriza', '3196677096', 'vecina del sector', '2026-08-13 18:49:53'),
(66, 67, 'Alba Garcia', '3046026981', 'Afectados', '2026-08-13 18:50:01'),
(67, 68, 'Katherin', '3024347931', 'No se', '2026-08-13 18:53:36'),
(68, 69, 'Yeneris Dayana Rodríguez', '3146026966', '', '2026-08-13 19:06:52'),
(69, 70, 'Yennifer Rodriguez Gomez', '3117427563', 'Afectados', '2026-08-13 19:13:11'),
(70, 71, 'Karol Torres', '3113619089', 'Familiar', '2026-08-13 19:38:30'),
(71, 72, 'Jhon Henrry Gonzales', '3123881365', 'Afectado', '2026-08-13 19:47:54'),
(72, 73, 'Jefferson', '3203071454', '', '2026-08-13 19:48:49'),
(73, 74, 'Maria Cielo Duque', '3217184257', 'Afcetada', '2026-08-13 19:50:13'),
(74, 75, 'Maria Esperanza Castellanos', '3113240577', 'Afectado', '2026-08-13 19:52:15'),
(75, 76, 'Maria Esperanza Castellanos', '3113240577', 'Afectado', '2026-08-13 19:52:18'),
(76, 77, 'Isabella', '3112106734', 'Comunicaciones', '2026-08-13 19:59:25'),
(77, 78, 'Sebastián Vargas', '3156897599', 'Persona que está a cargo', '2026-08-14 21:32:20'),
(78, 79, 'Mayerly Granada', '3107083713', 'Voluntaria WhatsApp', '2026-08-15 00:46:29'),
(79, 80, 'Lucia Cuervo ( fundación Angeles de la calle)', '3176560345', 'Líder', '2026-08-15 01:23:41'),
(80, 81, 'Guadalupe Nieto M', '3246219748', 'Comunitario', '2026-08-15 01:24:31'),
(81, 82, 'Ana Carolina Villota', '3108903358', 'Líder comunitario', '2026-08-15 01:43:16'),
(82, 83, 'Ana Carolina Villota', '3108903358', 'Líder comunitario', '2026-08-15 01:47:46'),
(83, 84, 'Carlos Enrique Diez', '3163334160', 'Propietario', '2026-08-15 02:13:06'),
(84, 85, 'Milena Jiménez Amaya', '3218985086', 'Madre del hogar', '2026-08-15 03:15:09'),
(85, 86, 'Otoniel González Ortiz', '3226170722', 'Dueño de la casa', '2026-08-15 14:31:00'),
(86, 87, 'Beatriz o Gustavo', '3114029592', 'Hermana del damnifocado', '2026-08-15 14:51:05'),
(87, 88, 'Nay', '', 'Hija de damnificada', '2026-08-15 15:00:34'),
(88, 89, 'Samantha', '31068867744', '', '2026-08-15 16:24:58'),
(89, 90, 'Flor estrella lopez', '3135293606', 'Persona afectada', '2026-08-15 17:19:49'),
(90, 91, 'Juan Carlos Soto', '3146785796', 'Persona afectada', '2026-08-15 17:41:41'),
(91, 92, 'José Wilson', '321 5031257', 'Persona afectada', '2026-08-15 18:09:10'),
(92, 93, 'Margarita', '300 3077136', 'habitante', '2026-08-15 18:27:31'),
(93, 94, 'YAZMIN TORRES Y LUIS ANGEL VANEGAS', '321 6674278', 'persona con la necesidad', '2026-08-15 18:56:36'),
(94, 95, 'LIDER ZONA DEL TOPACIO', '3122802599', '', '2026-08-15 19:01:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mascotas_perdidas`
--

CREATE TABLE `mascotas_perdidas` (
  `id` int(11) NOT NULL,
  `pin` varchar(10) DEFAULT NULL,
  `ciudad` varchar(50) NOT NULL DEFAULT 'manizales',
  `nombre_mascota` varchar(100) DEFAULT NULL,
  `tipo_animal` varchar(50) NOT NULL,
  `senas` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `lugar_visto` varchar(150) DEFAULT NULL,
  `fecha_visto` date NOT NULL,
  `estado` enum('perdido','encontrado') NOT NULL DEFAULT 'perdido',
  `nombre_reporta` varchar(150) NOT NULL,
  `telefono_reporta` varchar(50) NOT NULL,
  `avistado_por_nombre` varchar(150) DEFAULT NULL,
  `avistado_por_telefono` varchar(50) DEFAULT NULL,
  `fecha_avistamiento` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mascotas_perdidas`
--

INSERT INTO `mascotas_perdidas` (`id`, `pin`, `ciudad`, `nombre_mascota`, `tipo_animal`, `senas`, `imagen`, `lat`, `lng`, `lugar_visto`, `fecha_visto`, `estado`, `nombre_reporta`, `telefono_reporta`, `avistado_por_nombre`, `avistado_por_telefono`, `fecha_avistamiento`, `created_at`) VALUES
(1, NULL, 'manizales', '', 'Gato', 'Negrita con manchas blancas y café en la carita y patas blancas', 'img_6a7e147e4197f8.59388331.jpg', 5.0469410, -75.5098915, 'Villamaria mirador de las lomas', '2026-08-13', 'encontrado', 'No se conoce', '3145820407', NULL, NULL, NULL, '2026-08-13 19:01:18'),
(2, '1059', 'manizales', '', 'Perro', 'Pastor aleman', 'img_6a7f54171c4ac0.55065377.jpg', 5.0318327, -75.4593927, 'La Enea, sector Casa roja, arriba', '2026-08-14', 'perdido', 'Luisa', '3147279951', 'Liliana Castaño', '3207811250', '2026-08-14', '2026-08-14 17:44:55'),
(3, '8755', 'manizales', 'Paquita perdida', 'Gato', 'Blanco con negro ( tres manchas negras en su espalda)', 'img_6a7fcca8362928.68969953.jpg', 5.0655062, -75.5125916, 'Av. Santander edificio la calleja', '2026-08-15', 'perdido', 'Dueño en busqueda', '3137951224', NULL, NULL, NULL, '2026-08-15 02:19:20'),
(4, '8857', 'manizales', '', 'Gato', 'Color blanco con manchas café y ojos azules', 'img_6a80b0df7ec656.50502822.jpg', 5.0426756, -75.4973066, 'Aranjuez parte alta', '2026-08-15', 'perdido', 'Bleik', '+57 302 2547091', NULL, NULL, NULL, '2026-08-15 18:33:03');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `necesidades`
--

CREATE TABLE `necesidades` (
  `id` int(11) NOT NULL,
  `pin` varchar(10) DEFAULT NULL,
  `sector_id` int(11) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `fecha` date NOT NULL,
  `cantidad` varchar(100) DEFAULT NULL,
  `prioridad` enum('alta','media','baja') NOT NULL DEFAULT 'media',
  `estado` enum('requiere','atendida') NOT NULL DEFAULT 'requiere',
  `responsable_nombre` varchar(150) DEFAULT NULL,
  `responsable_telefono` varchar(50) DEFAULT NULL,
  `fecha_compromiso` date DEFAULT NULL,
  `reportado_por` varchar(150) DEFAULT NULL,
  `telefono_reporta` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `necesidades`
--

INSERT INTO `necesidades` (`id`, `pin`, `sector_id`, `tipo`, `descripcion`, `imagen`, `fecha`, `cantidad`, `prioridad`, `estado`, `responsable_nombre`, `responsable_telefono`, `fecha_compromiso`, `reportado_por`, `telefono_reporta`, `created_at`) VALUES
(1, NULL, 2, 'Otro', 'Remoción de escombros movimiento de elementos hacia el potrero de al lado. Hidratación', 'img_6a7e0ffdb48001.58580107.jpg', '2026-08-13', '3 familiar', 'alta', 'atendida', NULL, NULL, NULL, 'Guadalupe Nieto', '3246219748', '2026-08-13 18:42:06'),
(2, NULL, 3, 'Alimentos', 'Chocolate en polvo o chocolate en barra y panela', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Laura osorio', '3206468556', '2026-08-13 19:02:14'),
(3, NULL, 4, 'Alimentos', 'Se necesita alimentos. La familias de los bloques 46 y 47 no han podido recibir ayudas.', NULL, '2026-08-13', '', 'media', 'atendida', NULL, NULL, NULL, 'Gladys', '311 7313628', '2026-08-13 19:03:42'),
(4, NULL, 5, 'Otro', 'Hola a todos 💛💙❤️ Muchas gracias por sumarse como voluntarios a Juguetes por Colombia.\r\n\r\nApenas estamos empezando, así que hoy necesitamos mucha ayuda para organizarnos y poner la recolección en marcha.\r\n\r\nNos encontramos hoy a la 1:30 p.m. en la Torre del Cable. Desde allí estaremos recibiendo y organizando las donaciones durante la jornada.\r\n\r\nPueden apoyarnos con:\r\n\r\n• Recibir las donaciones en el punto de recolección.\r\n• Revisar, clasificar y organizar lo que vaya llegando por tipo, talla y edad.\r\n• Ayudarnos a llevar un inventario.\r\n• Compartir la campaña con amigos, familiares, empresas y grupos de WhatsApp.\r\n• Contactar empresas o personas que puedan donar productos, transporte, cajas o bolsas.\r\n• Apoyar con fotografías, videos y difusión en redes sociales.\r\n• Ayudar con logística y transporte.\r\n\r\n📍 1:30 p.m. — Encuentro en Torre del Cable\r\n📦 Después de las 6:00 p.m. — Organización de las donaciones en Silmaril, que será nuestro centro de acopio.\r\n\r\nQuienes puedan acompañarnos después de las 6 también serán de muchísima ayuda para clasificar, contar y dejar todo organizado en el centro de acopio.\r\n\r\nGracias por sumarse desde el comienzo. 🫶 Vamos construyendo esto entre todos.', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Paulina Ospina', '311 7313628', '2026-08-13 19:10:54'),
(5, NULL, 6, 'Ropa / Cobijas', 'Fundación de niños sin hogar que se ubicaba en el centro tuvo que evacuar y necesita provisiones', NULL, '2026-08-13', '', 'alta', 'requiere', NULL, NULL, NULL, 'Jimmy', '3147268175', '2026-08-13 19:13:21'),
(6, NULL, 7, 'Alimentos', 'Se está recolectando provisiones, alimentos, ropa, cobijas para llevar a Pereira', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Mariana Quintero', '3205585485', '2026-08-13 19:21:17'),
(7, NULL, 8, 'Alimentos', 'Hola, en arqui estamos necesitando esto:\r\n-Queso, Pan, bananos y mantequilla de maní para entrega de sándwiches \r\n-Enlatado.\r\n-Parva\r\n-Líquido: agua, gaseosa \r\n-Comida instantánea', NULL, '2026-08-13', '', 'media', 'atendida', NULL, NULL, NULL, 'Anonimo', '', '2026-08-13 19:31:59'),
(8, NULL, 9, 'Alimentos', 'alimento, aseo, zapatos talla 33 y 34 de niño y niña', NULL, '2026-08-13', '1 familia', 'media', 'atendida', 'estefania', '3212642693', '2026-08-13', 'Yaniret Cruz Gutierrez', '3103922770', '2026-08-13 19:51:37'),
(9, NULL, 10, 'Otro', 'Se necesita mucha ayuda en la Aurora Colegio Alfonso Hoyos. También se necesitan donaciones para la familia damnificada.', NULL, '2026-08-13', '', 'media', 'atendida', NULL, NULL, NULL, 'Camilo Muñoz', '3212957500', '2026-08-13 20:01:42'),
(10, NULL, 11, 'Refugio / Carpas', 'Se necesita carpas, agua, cremas antipañalitis, pañales, leche para bebé. NO LLEVAR COMIDA PREPARADA.', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Alejandra', 'CALLE 62 #1A -9', '2026-08-13 20:06:02'),
(11, NULL, 12, 'Alimentos', 'Alimentos, sánduches e hiratación para los voluntarios', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Maria del Mar', '3229722734', '2026-08-13 20:18:05'),
(12, NULL, 13, 'Otro', 'Familia perdio todo necesita materiales de construccion, cemento, ladrillos, agua, comida', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Maria Camila Marin', '3244774810', '2026-08-13 20:58:00'),
(13, NULL, 14, 'Maquinaria / Rescate', 'herramientas de oxicorte o donaciones para comprar herramientas y APCM', NULL, '2026-08-13', '1', 'media', 'requiere', NULL, NULL, NULL, 'Angel', '3046147314', '2026-08-13 21:24:37'),
(14, NULL, 15, 'Alimentos', 'alimentos no perecederos, elementos de aseo, utnsilios de cocina, articulos electrodomesticos para el hogar', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Punto de acopio confirmado', '', '2026-08-13 21:56:54'),
(15, NULL, 16, 'Alimentos', 'Tuvieron que evacuar. Necesitan ropa de cama, alimentos no perecederos, pañales talla M y L y demás', NULL, '2026-08-13', '', 'alta', 'requiere', NULL, NULL, NULL, 'Leidy', '3103992922', '2026-08-13 22:09:35'),
(16, NULL, 17, 'Otro', 'Necesitan cemento, arena, cal, brochas, rodillo para reparar sus casas', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Amanda Loaiza', '3177981191', '2026-08-13 22:20:42'),
(17, NULL, 18, 'Alimentos', 'Se reciben donaciones de alimentos en la junta de acción comunal barrio topacio para entregar a afectados sector morrogacho', NULL, '2026-08-13', '', 'media', 'requiere', NULL, NULL, NULL, 'Junta de acción comunal Topacio', '', '2026-08-13 22:31:20'),
(18, '4905', 19, 'Medicamentos', 'Xfavor si alguien tiene clozapina de 100 les agradezco', 'img_6a7e56c1522260.83136301.jpg', '2026-08-13', '30 pastillas', 'alta', 'requiere', NULL, NULL, NULL, 'M cuidador de Sebastián Valencia', '3123669785', '2026-08-13 23:44:01'),
(19, '3355', 21, 'Otro', 'Materiales para reconstruir su hogar', NULL, '2026-08-14', '4', 'alta', 'requiere', NULL, NULL, NULL, 'Banny Jaramillo', '3103612586', '2026-08-14 03:28:36'),
(20, '6331', 22, 'Ropa / Cobijas', 'Se necesita ropa para un muchacho talla m- pantalón 34- zapatos 39 y su hija pequeña de 5-6 años perdieron absolutamente todo en villa Maria, también se recibe implementos  de aseo y un mercado', NULL, '2026-08-14', '3', 'alta', 'requiere', NULL, NULL, NULL, 'Manuela duque', '3183049437', '2026-08-14 03:32:29'),
(21, '2078', 23, 'Alimentos', 'Numero de teléfono se va buzón no se pudo contactar.calle 16 con 17 Familia de escasos recursos muchos niños requieren comida', 'img_6a7f4cfbc03a85.48434444.jpg', '2026-08-14', '3', 'alta', 'requiere', NULL, NULL, NULL, 'Olga Uribe', '3003544440', '2026-08-14 17:14:35'),
(22, '1877', 25, 'Mascotas (alimento, refugio, atención veterinaria)', 'Se necesita ayuda para colocar tejas en un refugio de mascotas, y trasladar escombros', 'img_6a7f5443ce5aa1.49853045.jpg', '2026-08-14', '48 perros y 20 gatos', 'media', 'requiere', NULL, NULL, NULL, 'Leidy Ortiz Ocampo', '3022060845', '2026-08-14 17:45:40'),
(23, '3614', 28, 'Otro', 'Se registran muchas viviendas afectadas, unas sin techo, otras sin techo y paredes inestables, otras totalmente inhabitables, se requieren materiales de construcción para donar a las familias más vulnerables de menos recursos y que tengan cómo empezar a reconstruir.', NULL, '2026-08-14', '80', 'media', 'requiere', NULL, NULL, NULL, 'Carlos Andrés López Castaño', '3224790694', '2026-08-14 18:14:46'),
(24, '6288', 29, 'Otro', 'Estoy desalojada ,', NULL, '2026-08-14', '1', 'media', 'requiere', NULL, NULL, NULL, 'Mónica Arenas Montes', '3215182803', '2026-08-14 19:08:59'),
(25, '1650', 29, 'Agua potable', 'Comida, agua y vivienda y elementos necesarios para subsistir', NULL, '2026-08-14', 'Muchas más familias', 'alta', 'requiere', NULL, NULL, NULL, 'Alejo', '642933789', '2026-08-14 19:53:20'),
(26, '4963', 30, 'Otro', 'Necesitamos apoyo con combustible para los vehículos de ayuda de la ciudad de Manizales contactar 3154195166 Jairo López ministerio de interior Manizales aquí en bomberos voluntarios fundadores', NULL, '2026-08-14', '', 'alta', 'requiere', NULL, NULL, NULL, 'Jairo López ministerio de interior', '3154195166', '2026-08-14 20:09:39'),
(27, NULL, 31, 'Agua potable', 'Datos de ejemplo\r\nagua para 10 voluntarios', NULL, '2026-08-12', '10', 'media', 'atendida', 'joser', '310381200', '2026-08-12', 'wilmar echeverry', '3103817213', '2026-08-13 03:55:42'),
(28, NULL, 32, 'Atención médica', 'Se requiere silla de Ruedas para adulta mayor, me comunique con la persona y dice ya haber conseguido la silla de ruedas', NULL, '2026-08-13', '1', 'media', 'atendida', NULL, NULL, NULL, 'Anónimo', '3115163636', '2026-08-13 04:30:17'),
(29, NULL, 33, 'Otro', 'DONACION DE ALIMENTOS PARA MASCOTAS\r\n📍 PUNTO DE ENCUENTRO: Parque Caldas\r\n📅 DÍA: 13 de agosto\r\n⏰ HORA: 9:00 a. m.\r\n📲 WhatsApp: 315 875 5086', NULL, '2026-08-13', '100', 'alta', 'requiere', 'Silvana Durango Rendon', '3018284914', '2026-08-12', 'Andres Herrera', '315 875 5086', '2026-08-13 04:39:06'),
(30, NULL, 34, 'Otro', 'Se necesitan para 4 familias cemento gravilla varillas para estructura q se vio afectada', NULL, '2026-08-13', '4', 'media', 'requiere', 'Julio Sierra', '3128404873', '2026-08-12', 'Gloria ruda', '3205433644', '2026-08-13 05:02:39'),
(31, NULL, 35, 'Atención médica', 'DONACION DE SANGRE - SE REQUIERE SANGRE O- Y O+', NULL, '2026-08-13', '', 'alta', 'requiere', 'Santiago Garcia Londoño', '3003242132', '2026-08-12', 'Hemocentro del Café', '', '2026-08-13 05:15:51'),
(32, NULL, 36, 'Otro', 'Necesitamos voluntarios para desalojar una casa', NULL, '2026-08-13', '', 'alta', 'atendida', 'Lina', '3126241589', '2026-08-12', 'Valeria Villamil', '3146147498', '2026-08-13 05:27:10'),
(33, NULL, 37, 'Otro', '🚨 APOYO URGENTE – TRASTEO 🚨\r\n\r\nMañana necesitamos manos y transporte para apoyar un trasteo. 🙏🏽\r\n\r\n📍 Carrera 23 #26-29, piso 2\r\n📌 Centro de Manizales\r\n⏰ 7:00 a. m.\r\n\r\nNecesitamos personas que puedan ayudar con mano de obra y transporte para mover las pertenencias.\r\n\r\n🙏🏽 Por favor, quienes puedan apoyarnos, reaccionen a este mensaje con 🙋🏽‍♂️, 🚚 o ❤️ para saber con quiénes contamos y poder organizarnos.\r\n\r\nDe verdad necesitamos de su ayuda. Cada mano cuenta. 🤝🏼❤️‍🩹', NULL, '2026-08-13', '', 'alta', 'requiere', 'Leidy Arredondo', '3105665984', '2026-08-12', 'Anónimo', '', '2026-08-13 05:27:22'),
(34, NULL, 38, 'Mascotas (alimento, refugio, atención veterinaria)', 'Se necesita ayuda para asear animales y sus caniles como tambien cuido para gatos y perros y comida de gallinas, arena para gatos, bolsas para heces de perros e implementáis de aseo para los mismos y el lugar de ellos', NULL, '2026-08-13', '120 animales', 'media', 'atendida', NULL, NULL, NULL, 'Fundación angelitos de la calle', '3176560345', '2026-08-13 05:32:56'),
(35, NULL, 39, 'Refugio / Carpas', 'Casas desplomadas, perdida de todas sus pertenencias', NULL, '2026-08-13', '4 familias', 'alta', 'requiere', NULL, NULL, NULL, 'DIANA HURTADO', '3207010114', '2026-08-13 05:37:38'),
(36, NULL, 40, 'Alimentos', 'Es una invasión y la mayoría de personas trabajan en el rebusque diario, hay niños y abuelos con hambre', NULL, '2026-08-13', '100', 'media', 'requiere', 'Maria José Jiménez', '3208261816', '2026-08-12', 'Camila', '310 4074525', '2026-08-13 05:40:40'),
(37, NULL, 41, 'Otro', 'Se necesita ayuda para desalojar y ayudas económicas para las familias.', NULL, '2026-08-13', '10', 'media', 'requiere', 'Claudia Villa', '3145883866', '2026-08-12', 'Angela Arango', '3104518699', '2026-08-13 05:45:35'),
(38, NULL, 42, 'Alimentos', 'Se recibe alimentod no perecederos para ayudar a 700 familias del municipio. Las donaciones se reciben en el Consejo municipal', NULL, '2026-08-13', '700', 'media', 'requiere', 'Juan Pablo Ospina', '3127272801', '2026-08-13', 'Alejandra Martínez', '3127444490', '2026-08-13 06:13:47'),
(39, NULL, 43, 'Otro', 'Necesitamos LLENAR CAMION DE 8 TONELADAS.\r\nSaldra para el Choco\r\n\r\nMañana desde las 8:00 a. m. estaremos en FAMA, sector Milán, organizando una jornada de apoyo para las familias afectadas.\r\n\r\n📦 ¿Qué haremos?\r\n* Separar y clasificar las donaciones.\r\n* Armar paquetes y mercados.\r\n* Organizar medicamentos y ayudas especiales.\r\n* Cargar y transportar las ayudas.\r\n* Coordinar su entrega en los barrios y puntos donde más se necesitan.\r\n\r\n🏠 Pero no queremos quedarnos solo en la comida. También necesitamos enfocar esfuerzos en recuperar viviendas y garantizar techos dignos y seguros.\r\n\r\nEstamos buscando donaciones de:\r\n🧱 Cemento\r\n🏠 Tejas\r\n🎋 Guadua\r\n🔨 Materiales de construcción\r\n🚚 Transporte y mano de obra', NULL, '2026-08-13', '100', 'alta', 'requiere', 'Isabella García Lizcano', '3008527272', '2026-08-13', 'FAMA', '', '2026-08-13 06:15:53'),
(40, NULL, 44, 'Otro', 'Revisión estructural', NULL, '2026-08-13', '20', 'media', 'requiere', 'Diana Isabel', '3024008501', '2026-08-13', 'Natalia Llanos', '3177862240', '2026-08-13 06:38:10'),
(41, NULL, 45, 'Mascotas (alimento, refugio, atención veterinaria)', 'Alimento para gatos, arena sanitaria, alimento para perros todo relacionado con veterinaria ya que están brindando servicios médicos veterinarios gratuitos.', NULL, '2026-08-13', '', 'media', 'requiere', 'Giovanny Vergara - Luisa Santa', '3002824788', '2026-08-13', 'Centro de Acopio U. de Caldas.', '', '2026-08-13 06:39:20'),
(42, NULL, 46, 'Otro', 'Se necesita ayuda para sacar escombros de una casa, parte del patio y cocina está para colapsar', NULL, '2026-08-13', '', 'alta', 'requiere', 'Sandra', '3122977760', '2026-08-13', 'Cindy', '321 7004750', '2026-08-13 06:55:49'),
(43, NULL, 47, 'Alimentos', 'Los abuelos de la Casa del Divino Niño fueron reubicados en 2 casa provisionales. Necesitan:\r\n- pañales talla M y L\r\n- Alimentos para preparar y no perecederos\r\n- Ropa para dama y para hombre\r\n- Ropa de cama\r\n- Elementos de aseo', NULL, '2026-08-13', 'No especificada', 'media', 'requiere', 'Sara Maria Quintero', '3227249634', '2026-08-13', 'Leidy', '3103992922', '2026-08-13 07:00:06'),
(44, NULL, 48, 'Otro', 'Se necesitan pipas de gas y materiales para reconstrucción (gyplac, tejas, cemento, etc) Comida', NULL, '2026-08-13', '5', 'media', 'requiere', NULL, NULL, NULL, 'Manuela Moreno', '3113957886', '2026-08-13 07:02:04'),
(45, NULL, 49, 'Otro', 'Alojamiento temporal o fijo', NULL, '2026-08-13', '2', 'alta', 'requiere', NULL, NULL, NULL, 'Bernardo Marín', '3147294337', '2026-08-13 07:04:48'),
(46, NULL, 50, 'Otro', 'se requiere chocolate arroz aceite leche en polvo panela aseo pañales tallas sml y xl pañitos papel higenico guantes tapabocas', NULL, '2026-08-13', '150', 'alta', 'requiere', NULL, NULL, NULL, 'Sonia y Alejandra castaño', '3135298779. /3117054487', '2026-08-13 09:00:35'),
(47, NULL, 51, 'Alimentos', 'Se necesita alimentos y bebidas, es una zona afectada por el terremoto que no está recibiendo atención.', NULL, '2026-08-13', '150', 'media', 'requiere', 'Viviana Aristizabal', '3116704940', '2026-08-13', 'Valeria Galarza Salazar', '3205399376', '2026-08-13 09:10:03'),
(48, NULL, 52, 'Alimentos', 'Familia evacuada de escasos recursos quienes no cuentan con buen sustento económico y no han recibido buena ayuda.', NULL, '2026-08-13', '1 familia', 'media', 'requiere', 'Valen amariles', '3203779351', '2026-08-13', 'Edwin castro', '3137339269', '2026-08-13 14:48:14'),
(49, NULL, 53, 'Otro', 'URGENTE Requerimos presencia institucional, que nos expidan los documentos y formatos oficiales como damnificados / Agua y alimentos para las 11 Familias', NULL, '2026-08-13', '11 Familias', 'alta', 'requiere', 'Sachi', '3145144020', '2026-08-14', 'Luis Felipe López', '3148263064', '2026-08-13 15:25:33'),
(50, NULL, 55, 'Otro', 'La casa donde habitan 5 familias ha quedado muy dañada a raíz del terremoto se solicita ayuda para retirar escombros y demolición de las partes más afectadas de la casa', NULL, '2026-08-13', '5', 'media', 'requiere', 'Somos varias personas', '3203071454', '2026-08-13', 'Andrés López Jaramillo', '3196172822', '2026-08-13 16:35:03'),
(51, NULL, 46, 'Alimentos', 'Alimentos', NULL, '2026-08-13', '15 familias', 'alta', 'requiere', NULL, NULL, NULL, 'Maria Salazar', '3108396815', '2026-08-13 16:39:45'),
(52, NULL, 56, 'Alimentos', 'Familiaa que se vieron afectados en sus casas, estructuralmente', NULL, '2026-08-13', '15', 'alta', 'requiere', NULL, NULL, NULL, 'German,', '', '2026-08-13 16:55:34'),
(53, NULL, 57, 'Alimentos', 'Una casa en específico se derrumbó, pero hay otras afectadas estructural', NULL, '2026-08-13', '15', 'alta', 'requiere', NULL, NULL, NULL, 'Yaneth Cardona', '321 6226364', '2026-08-13 16:57:34'),
(54, NULL, 58, 'Otro', 'Requieren apoyo sacar sus pertenencias de las casas que deben desalojar', NULL, '2026-08-13', '20', 'media', 'atendida', NULL, NULL, NULL, 'María Fernanda Loaiza', '312 7902213', '2026-08-13 16:57:55'),
(55, NULL, 59, 'Alimentos', 'Alimentos para mi y mi familia perdi mi spa , mi espacio para trabajar', NULL, '2026-08-13', '4', 'media', 'requiere', 'Paula Cruz', '3146825130', '2026-08-13', 'Michelle Andrea giraldo', '3227409806', '2026-08-13 17:04:14'),
(56, NULL, 60, 'Alimentos', 'Artículos de aseo y canasta familiar - dirección completa calle 30#27-21', NULL, '2026-08-13', '6', 'media', 'requiere', NULL, NULL, NULL, 'Carmen maria morales', '3016368780', '2026-08-13 18:28:59'),
(57, NULL, 61, 'Alimentos', 'Alimentos y elementos de aseo - dirección completa : calle 30# 27-27', NULL, '2026-08-13', '2', 'media', 'requiere', NULL, NULL, NULL, 'Deiker Javier Serrano', '3207103769', '2026-08-13 18:31:13'),
(58, NULL, 62, 'Otro', 'Desalojar', NULL, '2026-08-13', '2 familias', 'alta', 'atendida', NULL, NULL, NULL, 'Lina', '3103417000', '2026-08-13 18:31:57'),
(59, NULL, 63, 'Alimentos', 'Canasta familiar y implementación de aseo : dirección : carrera 30#20-30', NULL, '2026-08-13', '5', 'media', 'requiere', 'Centro de acopio Facultad de Arquitectura', '3127387248', '2026-08-13', 'Socorro Martinez', '3116057749', '2026-08-13 18:34:53'),
(60, NULL, 64, 'Alimentos', 'No tienen dirección -Canasta familiar y elementos de aseo, 2 gatos y 1 perro', NULL, '2026-08-13', '5', 'media', 'requiere', 'Centro de acopio facultad de Arquitectura', '3127272801', '2026-08-13', 'Arabelly Calle Casas', '3142249720', '2026-08-13 18:43:41'),
(61, NULL, 65, 'Alimentos', 'Mi familia quedo con su casa que es en bareque sin techo y esta crujiendo, a pesar de solicitar la visita de bomberos aun no los van a ayudar', NULL, '2026-08-13', '10', 'alta', 'requiere', 'Sachi', '3145144020', '2026-08-14', 'Laura Vanessa López Villa', '3017843982', '2026-08-13 18:49:38'),
(62, NULL, 66, 'Alimentos', 'Se necesita alimentos para familias que perdieron su hogar', NULL, '2026-08-13', '50', 'media', 'requiere', NULL, NULL, NULL, 'Rosa Iriza', '3196677096', '2026-08-13 18:49:54'),
(63, NULL, 67, 'Alimentos', 'Canasta familiar , implementos de aseo,comida para mascota perro y gato son do adultos mayores dirección: carrera 29 calle 21-0', NULL, '2026-08-13', '2', 'media', 'requiere', 'Sachi', '3145144020', '2026-08-15', 'Alba Garcia', '3046026981', '2026-08-13 18:50:01'),
(64, NULL, 68, 'Maquinaria / Rescate', 'Una edificación esta por caerse', NULL, '2026-08-13', '3-6', 'media', 'requiere', NULL, NULL, NULL, 'Katherin', '3024347931', '2026-08-13 18:53:36'),
(65, NULL, 69, 'Alimentos', 'No tienen dirección es una invasión - Alimentos y elementos de aseo, 2 gatos 1 perro', NULL, '2026-08-13', '4', 'media', 'requiere', 'Centro de acopio facultad de Arquitectura', '3127272801', '2026-08-13', 'Yeneris Dayana Rodríguez', '3146026966', '2026-08-13 19:06:52'),
(66, NULL, 70, 'Alimentos', 'No tienen dirección es una invasión - Alimentos y implementos  de aseo - Niño etapa 3 de pañal - 1 gato y perro - Mujer en estado de embarazo', NULL, '2026-08-13', '4', 'media', 'requiere', 'Centro de acopio facultad de Arquitectura', '3127272801', '2026-08-13', 'Yennifer Rodriguez Gomez', '3117427563', '2026-08-13 19:13:11'),
(67, NULL, 71, 'Refugio / Carpas', 'Se necesita evacuación de la vivienda en estado de deterioro y peligro de desplome de muros que afectan a viviendas, más abajo, llamar antes de ir porque es una vivienda que no tiene dirección exacta está más abajo de lo que muestra el map', NULL, '2026-08-13', '2', 'alta', 'requiere', NULL, NULL, NULL, 'Karol Torres', '3113619089', '2026-08-13 19:38:30'),
(68, NULL, 72, 'Alimentos', 'Alimentos y elementos de aseo, 1 gato y 1 perro - Dirección:Calle 21#29-35', NULL, '2026-08-13', '2', 'media', 'requiere', NULL, NULL, NULL, 'Jhon Henrry Gonzales', '3123881365', '2026-08-13 19:47:54'),
(69, NULL, 73, 'Otro', 'Se necesita voluntarios para recoger escombros en la Junta de Acción Comunal por la Virgen.', NULL, '2026-08-13', '10 a 15 voluntarios', 'media', 'requiere', 'Anonimo (Garcés)', '314 7669693', '2026-08-13', 'Jefferson', '3203071454', '2026-08-13 19:48:49'),
(70, NULL, 74, 'Alimentos', 'Adulta mayot vive con el nieto - Viveres y elementos de aseo - 1 perro Dirección: Calle 21#29-33', NULL, '2026-08-13', '2', 'media', 'requiere', NULL, NULL, NULL, 'Maria Cielo Duque', '3217184257', '2026-08-13 19:50:14'),
(71, NULL, 75, 'Alimentos', 'Canasta familiar y elementos e aseo, 1 perro y 1 gato - Dirección Calle 21#29-33', NULL, '2026-08-13', '4', 'media', 'requiere', 'Sachi', '3145144020', '2026-08-14', 'Maria Esperanza Castellanos', '3113240577', '2026-08-13 19:52:18'),
(72, NULL, 76, 'Alimentos', 'Canasta familiar y elementos e aseo, 1 perro y 1 gato - Dirección Calle 21#29-33', NULL, '2026-08-13', '4', 'media', 'requiere', NULL, NULL, NULL, 'Maria Esperanza Castellanos', '3113240577', '2026-08-13 19:52:18'),
(73, NULL, 77, 'Alimentos', 'Se necesitan atender casos específicos', NULL, '2026-08-13', '15', 'media', 'requiere', NULL, NULL, NULL, 'Isabella', '3112106734', '2026-08-13 19:59:26'),
(74, '7061', 78, 'Medicamentos', 'olmesartán de 40 mg, esomeprazol de 40mg, trazodona de 150mg, sertralina de 100 mg, rosuvastatina de 40 mg, levoamlodipino de 2,5 mg', NULL, '2026-08-14', '1', 'media', 'requiere', NULL, NULL, NULL, 'Sebastián Vargas', '3156897599', '2026-08-14 21:32:20'),
(75, '1993', 73, 'Otro', 'Se requieren lonas para cubrir casas dañadas y evitar robos de lo poco que quedó.', NULL, '2026-08-14', '', 'alta', 'requiere', NULL, NULL, NULL, 'Santiago Alzate', '3122335959', '2026-08-14 22:43:12'),
(76, '6777', 79, 'Otro', 'Material de construcción: Gravilla, cemento, laminas, tejas etc. Para ayudar a reconstruir la casa de una familia de bajos recursos que quedo muy afectada', NULL, '2026-08-15', '1 FAMILIA', 'media', 'requiere', NULL, NULL, NULL, 'Mayerly Granada', '3107083713', '2026-08-15 00:46:29'),
(77, '9633', 80, 'Mascotas (alimento, refugio, atención veterinaria)', 'Se necesita alimentos y medicamentos para perros y gatos, elementos de aseo, mercado', 'img_6a7fc5415e3cf9.03889688.jpg', '2026-08-15', '92 perros, 4 gatos, una pareja adultos', 'media', 'requiere', NULL, NULL, NULL, 'Lucia Cuervo ( fundación Angeles de la calle)', '3176560345', '2026-08-15 01:23:41'),
(78, '3092', 81, 'Otro', '1 Disco de corte para metal de 4 pulgadas y 1 Disco de corte para madera.\r\n\r\n2 cajas de puntilla de 1/2 pulgadas', NULL, '2026-08-15', '3', 'media', 'requiere', NULL, NULL, NULL, 'Guadalupe Nieto M', '3246219748', '2026-08-15 01:24:31'),
(79, '8525', 82, 'Otro', 'Se necesitan 15 tejas y utensilios de cocina', NULL, '2026-08-15', '3 familias', 'alta', 'requiere', NULL, NULL, NULL, 'Ana Carolina Villota', '3108903358', '2026-08-15 01:43:17'),
(80, '1953', 83, 'Ropa / Cobijas', 'Cobijas, colchones, sabanas', NULL, '2026-08-15', '10', 'alta', 'requiere', NULL, NULL, NULL, 'Ana Carolina Villota', '3108903358', '2026-08-15 01:47:46'),
(81, '2746', 84, 'Otro', 'Mi casa en Trujillo sufrió daños en la infraestructura, paredes agrietadas , piso reventado , necesito ayuda profesional mi tío ya la familia están allá actualmente. Gracias', NULL, '2026-08-15', '4', 'media', 'requiere', NULL, NULL, NULL, 'Carlos Enrique Diez', '3163334160', '2026-08-15 02:13:06'),
(82, '2462', 85, 'Otro', 'La casa se encuentra en riesgo y perdió parte del techo con tejas de barro. Sin embargo, la medida más urgente es utilizar una caseta al lado de la casa que requiere tejas de zinc  de eternit para que puedan habitar mientras se puede intervenir la casa.', NULL, '2026-08-15', '4', 'alta', 'requiere', NULL, NULL, NULL, 'Milena Jiménez Amaya', '3218985086', '2026-08-15 03:15:09'),
(83, '1934', 86, 'Otro', 'Se necesita material de construcción, no importa su cantidad, tejas, pintura, etc. Material en general.', NULL, '2026-08-15', '1 familia', 'alta', 'requiere', NULL, NULL, NULL, 'Otoniel González Ortiz', '3226170722', '2026-08-15 14:31:01'),
(84, '8919', 87, 'Otro', 'Necesitan como prioridad materiales para  el techo , super boat de resto y gracias  a dios muchas ayudas les llegaron el dia de hoy. Beatriz hermana del afectado.', NULL, '2026-08-15', '1 familia', 'alta', 'requiere', NULL, NULL, NULL, 'Beatriz o Gustavo', '3114029592', '2026-08-15 14:51:05'),
(85, '8066', 88, 'Otro', 'Se necesitan materiales de construcción para arreglar techos y paredes.', NULL, '2026-08-15', '1 familia', 'alta', 'requiere', NULL, NULL, NULL, 'Nay', '', '2026-08-15 15:00:34'),
(86, '3291', 89, 'Alimentos', 'Se necesita, comida, agua potable, ropa lo que se tenga para donar para llevar el día lunes a la vereda alto bonito de Belalcázar', NULL, '2026-08-15', '', 'alta', 'requiere', NULL, NULL, NULL, 'Samantha', '31068867744', '2026-08-15 16:24:59'),
(87, '4888', 90, 'Otro', 'Se solicita ayuda para recoger escombros  por el acentamiento de Samaria casa\r\nTambién se solicita almuerzos preparados\r\n Mercado \r\nRopa \r\nImplementos de aseo, pañales \r\nElectrodomésticos', NULL, '2026-08-15', '7-8 personas', 'media', 'requiere', NULL, NULL, NULL, 'Flor estrella lopez', '3135293606', '2026-08-15 17:19:49'),
(88, '1087', 91, 'Otro', 'Se solicita ayuda para sacar y trasladar pertenencias ya que solicitaron desalojar, ya tiene donde llegar. \r\nTambién ayuda con mercado eh implementos de aseo \r\nY material de construcción para arreglar su vivienda', NULL, '2026-08-15', '', 'media', 'requiere', NULL, NULL, NULL, 'Juan Carlos Soto', '3146785796', '2026-08-15 17:41:41'),
(89, '6380', 92, 'Otro', 'Material de construcción', NULL, '2026-08-15', '', 'media', 'requiere', NULL, NULL, NULL, 'José Wilson', '321 5031257', '2026-08-15 18:09:10'),
(90, '1714', 93, 'Otro', 'Edificio Santodomingo Carrera 23 # 60 - 80 edificio Estrella\r\nContacto: 300 3077136 Margarita\r\n\r\nNecesitamos ayuda en poder gestionar materiales complementarios:\r\n\r\n1. Cerruchos \r\n2. ⁠Lonas\r\n3. ⁠palas ( para mover escombro )\r\n4. ⁠cierras eléctricas \r\n5. ⁠extensiones\r\n6. ⁠guantes \r\n7. ⁠cascos\r\n8. ⁠herramienta menor ( Martillos , entre otros )\r\n\r\nNo $$$. Físico\r\n\r\nTambién Voluntarios….', NULL, '2026-08-15', '', 'media', 'requiere', NULL, NULL, NULL, 'Margarita', '300 3077136', '2026-08-15 18:27:31'),
(91, '4502', 94, 'Otro', 'ELLOS SON DEL BAJO TABLAZO ,ELLA AUN ESTA EN HOSPITAL EN ONCOLOGOS Y REQUIEREN UTENSILIOS DE COCINA, IMPLEMENTOS DE ASEO, COLCHONETAS , AYUDA ECONOMICA PARA PAGAR EL ARRIENDO, Y NECESITAN COMIDA PREPARADA PERO SOLO PARA EL SEÑOR ESPOSO ACOMPAÑANTE DE ELLA TODO EL DIA EN EL HOSPITAL, NECESITA LAS 3 COMIDAS. SE DEBE LLAMAR PARA COORDINAR CONEL ESPOSO LA ENTREGA', NULL, '2026-08-15', '1', 'alta', 'requiere', NULL, NULL, NULL, 'YAZMIN TORRES Y LUIS ANGEL VANEGAS', '321 6674278', '2026-08-15 18:56:36'),
(92, '7988', 95, 'Alimentos', 'ANCIANATO LA AURORA PAÑALES ADULTO L\r\nBARRIO TOPACIO: \r\nPAÑALES PARA UN ADULTO MAYOR,\r\nADULTO MAYOR: TUVO UN ACCIDENTE NO RECIBE AYUDAS NECESITA MERCADO Y COSAS DE ASEO \r\nCHICO QUE SE QUEDO SIN TRABAJO CON UNA BEBE NECESITA PAÑALES Y PAÑITOS LECHE FORMULA MERCADO\r\nVEREDA LA AURORA VEREDA LA ARGELIA NECESITAN PARA VARIAS FAMILIAS UTENSILIOS DE ASEO, MERCADO, UTENSILIOS DE COCINA \r\nCOMUNICARSE Y COORDINAR CON LA LIDER DEL SECTOR PARA LLEGAR A LAS FAMILIAS YA TIENEN LISTADOS.', NULL, '2026-08-15', '10', 'alta', 'requiere', NULL, NULL, NULL, 'LIDER ZONA DEL TOPACIO', '3122802599', '2026-08-15 19:01:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `noticias`
--

CREATE TABLE `noticias` (
  `id` int(11) NOT NULL,
  `ciudad` varchar(50) DEFAULT NULL COMMENT 'NULL = visible en todas las ciudades',
  `titulo` varchar(200) NOT NULL,
  `contenido` text NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `autor` varchar(150) DEFAULT NULL,
  `fecha` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `noticias`
--

INSERT INTO `noticias` (`id`, `ciudad`, `titulo`, `contenido`, `imagen`, `autor`, `fecha`, `created_at`) VALUES
(1, NULL, 'Recursos de Apoyo - Mujeres con Ideales', 'Pagina web con herramientas muy importantes para apoyar la situación de emergencias\r\n\r\nemergencia.mujeresconideales.org', 'img_6a7e1b510f1639.94066218.jpg', 'Mujeres con ideales', '2026-08-13', '2026-08-13 19:30:25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ofrecimientos`
--

CREATE TABLE `ofrecimientos` (
  `id` int(11) NOT NULL,
  `pin` varchar(10) DEFAULT NULL,
  `ciudad` varchar(50) NOT NULL DEFAULT 'manizales',
  `tipo` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `cantidad` varchar(100) DEFAULT NULL,
  `fecha` date NOT NULL,
  `nombre_ofrece` varchar(150) NOT NULL,
  `telefono_ofrece` varchar(50) DEFAULT NULL,
  `estado` enum('disponible','entregado') NOT NULL DEFAULT 'disponible',
  `reservado_por_nombre` varchar(150) DEFAULT NULL,
  `reservado_por_telefono` varchar(50) DEFAULT NULL,
  `fecha_reserva` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `ofrecimientos`
--

INSERT INTO `ofrecimientos` (`id`, `pin`, `ciudad`, `tipo`, `descripcion`, `imagen`, `cantidad`, `fecha`, `nombre_ofrece`, `telefono_ofrece`, `estado`, `reservado_por_nombre`, `reservado_por_telefono`, `fecha_reserva`, `created_at`) VALUES
(1, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Puedo ayudar como voluntaria, en Manizales o Pereira', NULL, '', '2026-08-13', 'Mayra Alejandra Silva Quesada', '3142601155', 'disponible', NULL, NULL, NULL, '2026-08-13 18:32:42'),
(2, NULL, 'manizales', 'Otro', 'Soy psicóloga y ofrezco atención gratuita', NULL, '', '2026-08-13', 'Jessica Paola Higuita', '3229455058', 'disponible', NULL, NULL, NULL, '2026-08-13 18:40:23'),
(3, NULL, 'manizales', 'Otro', 'Soy Psicologa ofrezco apoyo Psicoemocional sin costo', NULL, '2 horas', '2026-08-13', 'Isis Peña Manso... Psicologa', '3117854137', 'disponible', NULL, NULL, NULL, '2026-08-13 18:52:36'),
(4, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Ayudo en lo que se necesite en el hogar: traslados, recogida de escombros y transporte (moto). Manizales y sus alrededores', NULL, 'Un día de voluntariado', '2026-08-13', 'María del Mar Añasco Mina', '3158033299', 'disponible', NULL, NULL, NULL, '2026-08-13 18:58:57'),
(5, NULL, 'manizales', 'Medicamentos', 'Estoy gestionando el tema de medicamentos, con formula médica.', NULL, '', '2026-08-13', 'Sonia', '3218069233 o 3105127975', 'disponible', 'Díana Paola Ceballos Quintero', '3145797283', '2026-08-15', '2026-08-13 19:01:09'),
(6, NULL, 'manizales', 'Transporte / Vehículo', 'Vehículo pequeño', NULL, '1', '2026-08-13', 'Ana Victoria Jaramillo Rivera', '3147531573', 'disponible', NULL, NULL, NULL, '2026-08-13 19:04:25'),
(7, NULL, 'manizales', 'Transporte / Vehículo', 'Ofrezco vehículo Mazda 2 en Manizales para ayudar a  transportar personas', NULL, '1', '2026-08-13', 'Héctor Vasquez', '3103972579', 'disponible', NULL, NULL, NULL, '2026-08-13 19:15:36'),
(8, NULL, 'quibdo', 'Voluntariado / Mano de obra', 'Soy Psicóloga dispuesta a viajar y apoyar y ofrecer servicios de primeros auxilios psicológicos', NULL, 'Dos días', '2026-08-13', 'Mayerly Alejandra Supelano Fino', '3007801987', 'disponible', NULL, NULL, NULL, '2026-08-13 19:51:37'),
(9, NULL, 'manizales', 'Transporte / Vehículo', 'Pongo a disposición mi vehículo particular por si alguien puede ser útil para transportar ayudas, alimentos, personas o trasteos pequeños.', NULL, 'Cuento con un vehículo particular (Nissan March)', '2026-08-13', 'Juan Esteban López', '3122427175', 'disponible', NULL, NULL, NULL, '2026-08-13 19:55:00'),
(10, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Tengo una pica para ayudar a partir bloques grandes de escombros, pero para cualquier otra cosa que necesiten mano de obra estoy disponible', 'img_6a7e2bba688af9.92587874.jpg', 'Remoción de escombros o movimiento de paquetes, etc', '2026-08-13', 'Diego', '3105418451', 'disponible', NULL, NULL, NULL, '2026-08-13 20:40:26'),
(11, NULL, 'manizales', 'Atención médica', 'Soy Lic en Psicología atendiendo catastrofes', NULL, '', '2026-08-13', 'Grachu', '541151500059', 'disponible', NULL, NULL, NULL, '2026-08-13 21:03:42'),
(12, NULL, 'manizales', 'Alimentos', '24 algos para voluntarios', 'img_6a7e4b4385a033.14378964.jpg', 'Algos para voluntarios', '2026-08-13', 'Juan Manuel Betancurt', '3113658359', 'disponible', 'Diana Paola Ceballos Quintero', '3145797283', '2026-08-15', '2026-08-13 22:54:59'),
(13, NULL, 'manizales', 'Otro', '10 pares de guantes para escombros\r\n10 tapabocas para polvo', 'img_6a7e4be59bd186.64878390.jpg', 'Insumo para trabajo', '2026-08-13', 'Juan Manuel Betancurt', '3113658359', 'disponible', NULL, NULL, NULL, '2026-08-13 22:57:41'),
(14, '5133', 'manizales', 'Otro', 'Psicologa, buscas un espacio para ser escuchad@, comprendid@ y poder acompañarte  a transitar este proceso?... Te ofrezco de manera gratuita mi acompañamiento en este momento de emergencia', NULL, 'Virtual, telefónico', '2026-08-13', 'Claudia pescador', '3009001680', 'disponible', NULL, NULL, NULL, '2026-08-13 23:48:41'),
(15, '1379', 'manizales', 'Voluntariado / Mano de obra', 'Puedo ayudar en las zonas de Manizales y Pereira o cercanos a cualquiera de las 2 ciudades', NULL, 'Disponible viernes, sábado y domingo', '2026-08-14', 'Mariana Álvarez', '3046625818', 'disponible', NULL, NULL, NULL, '2026-08-14 02:21:19'),
(16, '3480', 'manizales', 'Voluntariado / Mano de obra', 'Mano de obra en centros de acopio, pongo mi carro a disposición los días que no son de pico y placa , para móviles personas , repartir', NULL, 'Puedo ayudar en centros de acopio, pongo también mi carro a disposición los días que no tengo pico y', '2026-08-14', 'Sandra', '3158114179', 'disponible', NULL, NULL, NULL, '2026-08-14 14:04:06'),
(17, '4111', 'manizales', 'Refugio / Carpas', 'Hola tengo dos carpas resisten poca agua pero pueden ser muy útiles en este momento para refugiarse, son de 4 personas cada una', NULL, '2', '2026-08-14', 'Veronica Quintero', '3203343003', 'disponible', NULL, NULL, NULL, '2026-08-14 14:15:48'),
(18, '3374', 'manizales', 'Otro', 'Tapabocas con filtros y bolsas de alta densidad', NULL, '50', '2026-08-14', 'Diana sierra', '3128335083', 'disponible', NULL, NULL, NULL, '2026-08-14 15:10:09'),
(19, '7169', 'manizales', 'Otro', 'Ingeniero civil ofrece ayuda para evaluar el estado de casas o apartamentos , comunicarse por WhatsApp', NULL, '', '2026-08-14', 'Julián Ortiz', '+33789985101', 'disponible', NULL, NULL, NULL, '2026-08-14 15:58:22'),
(20, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Tengo disponibilidad de tiempo', NULL, '24/7', '2026-08-13', 'Lina nieto', '3126241589', 'disponible', 'Isabel Gómez', '3122591446', '2026-08-12', '2026-08-13 05:02:31'),
(21, NULL, 'manizales', 'Voluntariado / Mano de obra', '', NULL, '', '2026-08-13', 'Federico', '3102503202', 'disponible', NULL, NULL, NULL, '2026-08-13 05:12:35'),
(22, NULL, 'manizales', 'Transporte / Vehículo', '1 camioneta con platon', NULL, '1', '2026-08-13', 'Edilson Zuluaga', '3508265781', 'disponible', NULL, NULL, NULL, '2026-08-13 05:26:14'),
(23, NULL, 'manizales', 'Atención médica', 'Tecnóloga en atención prehospitalaria ( paramédico)', NULL, '', '2026-08-13', 'Vanessa Lozano Palacio', '3102525111', 'disponible', NULL, NULL, NULL, '2026-08-13 05:28:41'),
(24, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Ingeniera de alimentos, verificación de estado y entrega de alimentos', NULL, '4 horas diarias', '2026-08-13', 'Carolina López Cadavid', '3114489605', 'disponible', 'Tifanny', '3114544805', '2026-08-12', '2026-08-13 05:29:12'),
(25, NULL, 'manizales', 'Otro', 'Acompañamiento psicológico', NULL, 'Una sesión gratuita por persona o familia, por consecuencias emocionales derivadas del terremoto', '2026-08-13', 'Angela María Londoño Jaramillo', '3137671856', 'disponible', NULL, NULL, NULL, '2026-08-13 05:31:10'),
(26, NULL, 'manizales', 'Voluntariado / Mano de obra', '', NULL, '1', '2026-08-13', 'Edilson Zuluaga', '3508265781', 'disponible', NULL, NULL, NULL, '2026-08-13 05:33:16'),
(27, NULL, 'manizales', 'Transporte / Vehículo', 'Ofrezco automóvil para transportar personas que lo requieran o carga liviana', NULL, '3 horas de voluntariado, en la tarde', '2026-08-13', 'Sergio Alzate', '3138521654', 'disponible', NULL, NULL, NULL, '2026-08-13 05:40:07'),
(28, NULL, 'manizales', 'Voluntariado / Mano de obra', 'CLEAN LAND SAS \r\nOFRECE MANO DE OBRA CALIFICADA PARA DERRIBAR ESTRUCTURAS EN ALTO RIESGO\r\nCONTAMOS CON PERSONAL PREPARADO Y HERRAMIENTAS PARA DESARROLLAR ESTAS ACATIVIDADES', NULL, '40 personas con conocimiento en estructura', '2026-08-13', 'Jeferson toro', '3203071454', 'disponible', NULL, NULL, NULL, '2026-08-13 05:53:33'),
(29, NULL, 'manizales', 'Otro', 'Botas punta de acero talla 36', NULL, '1', '2026-08-13', 'Zarely bermudez', '3208451586', 'disponible', 'Adriana Muriel', '3205922400', '2026-08-12', '2026-08-13 05:56:14'),
(30, NULL, 'manizales', 'Atención veterinaria / Mascotas', 'Médicos veterinarios, insumos médicos, búsqueda y rescate de mascotas perdidas a causa del terremoto, refrigerio para voluntarios.', NULL, 'Cualquier hora', '2026-08-13', 'Valeria Zuluag mejia', '3006161656', 'disponible', 'Marcela Isaza jaramillo', '3004861837', '2026-08-13', '2026-08-13 05:58:01'),
(31, NULL, 'manizales', 'Transporte / Vehículo', 'Camioneta', NULL, '1', '2026-08-13', 'Mónica Noriega', '3167025625', 'disponible', NULL, NULL, NULL, '2026-08-13 06:06:03'),
(32, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Ingeniera de alimentos.', NULL, '1', '2026-08-13', 'Mónica Noriega', '3167025625', 'disponible', NULL, NULL, NULL, '2026-08-13 06:06:35'),
(33, NULL, 'manizales', 'Voluntariado / Mano de obra', '', NULL, '', '2026-08-13', 'Laura', '3234981921', 'disponible', NULL, NULL, NULL, '2026-08-13 06:07:46'),
(34, NULL, 'manizales', 'Transporte / Vehículo', 'Movilización de personas y cosas', NULL, '3 horas de voluntariado', '2026-08-13', 'Johana', '3218420488', 'disponible', NULL, NULL, NULL, '2026-08-13 06:16:37'),
(35, NULL, 'manizales', 'Atención médica', 'Apoyo a niños desde área psicológica o recreación en albergues', NULL, '', '2026-08-13', 'Sara Herrera', '3016571624', 'disponible', NULL, NULL, NULL, '2026-08-13 06:18:53'),
(36, NULL, 'manizales', 'Otro', 'Atención psicológica y recreativa a niños y niñas', NULL, 'Tiempo disponible', '2026-08-13', 'Viviana Andrea Correa', '3135981069', 'disponible', NULL, NULL, NULL, '2026-08-13 06:33:22'),
(37, NULL, 'manizales', 'Transporte / Vehículo', 'Ojalá lugares donde estén ya recogidos y en grandes cantidades', NULL, 'Recolección de escombros en camiones grande', '2026-08-13', 'Daniel', '3232100474', 'disponible', NULL, NULL, NULL, '2026-08-13 06:33:49'),
(38, NULL, 'manizales', 'Otro', 'Atencion Psicologica en Villamaria', NULL, '2horas diarias', '2026-08-13', 'Isis Peña Manso... Psicologa', '3117854137', 'disponible', NULL, NULL, NULL, '2026-08-13 06:38:33'),
(39, NULL, 'manizales', 'Alimentos', 'Lechonas Ahumadas de 300 gramos', NULL, '200', '2026-08-13', 'Juan Felipe Serna', '3104748677', 'disponible', NULL, NULL, NULL, '2026-08-13 06:42:02'),
(40, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Soy ingeniera industrial y coach, ofrezco acompañamiento emocional y orientación  para los damnificados o quien lo necesite\r\nTambien mano de obra para organizar, inventariar, empacar', NULL, '4 - 8 horas', '2026-08-13', 'Aura Gutierrez', '3012920591', 'disponible', NULL, NULL, NULL, '2026-08-13 07:09:06'),
(41, NULL, 'manizales', 'Alimentos', 'Un refrigerio sanduches con jugo', NULL, '300', '2026-08-13', 'Maira Garcia', '+51991213607', 'disponible', NULL, NULL, NULL, '2026-08-13 07:47:40'),
(42, NULL, 'manizales', 'Maquinaria / Rescate', 'Palas\r\nPicas \r\nMasetas \r\nLineas de vida y sogas \r\nTaladro demoledor \r\nY herramienta de mano', NULL, 'Herramienta de mano, lineas de vida, y demolición', '2026-08-13', 'Juan Camilo Jaramillo cava remodelación & mas', '3208109302', 'disponible', NULL, NULL, NULL, '2026-08-13 07:54:33'),
(43, NULL, 'manizales', 'Medicamentos', 'Insulina para niños con diabetes tipo 1', NULL, '', '2026-08-13', 'Sofía Ospina', '3127878767', 'disponible', 'Meicy Tamayo', '3103626789', '2026-08-15', '2026-08-13 07:59:27'),
(44, NULL, 'manizales', 'Otro', 'Atenciones de primeros auxilios psicológicos en desastres para adultos, adultos mayores, adolescentes y niños.', NULL, '4 psicólogos especialistas en emergencias y desastres', '2026-08-13', 'Paty', '+56955815523', 'disponible', NULL, NULL, NULL, '2026-08-13 08:19:47'),
(45, NULL, 'manizales', 'Otro', 'Recreación para niños en barrios afectados y albergues', NULL, 'Tardes.', '2026-08-13', 'DEICY MILENA', '3104964016', 'disponible', 'Diana Paola Ceballos Quintero', '3145797283', '2026-08-15', '2026-08-13 13:56:04'),
(46, NULL, 'manizales', 'Otro', 'COLCHONES \r\nEn buenas condiciones.', NULL, '4', '2026-08-13', 'Johana Naranjo', '3167374346', 'disponible', NULL, NULL, NULL, '2026-08-13 14:12:58'),
(47, NULL, 'manizales', 'Alimentos', 'Desayunos y Almuerzos preparados', NULL, '20', '2026-08-13', 'Laura', '3217698448', 'disponible', NULL, NULL, NULL, '2026-08-13 16:31:37'),
(48, NULL, 'manizales', 'Otro', 'Mercado con todo lo necesario para familia que lo necesite', NULL, '2', '2026-08-13', 'María José', '3227041971', 'entregado', NULL, NULL, NULL, '2026-08-13 16:37:07'),
(49, NULL, 'manizales', 'Transporte / Vehículo', 'Podemos transportar personas o ayudar a llevar trasteos', NULL, 'Cupo para 3 personas y Bodega grande de gol Vogage', '2026-08-13', 'Tomas de la osss', '3207298581', 'disponible', NULL, NULL, NULL, '2026-08-13 17:04:35'),
(50, NULL, 'manizales', 'Otro', 'Hola, soy psicóloga, puedo brindar apoyo emocional a aquellas personas que necesitan ser escuchadas, estoy ubicada en el barrio las colinas, estoy disponible para coordinar lugar de encuentro o por medio de llamada', NULL, 'Voluntariado apoyo psicológico y emocional, contención emocional', '2026-08-13', 'Adriana Jaramillo', '3117986949', 'disponible', NULL, NULL, NULL, '2026-08-13 18:06:54'),
(51, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Puedo recoger escombros, armar donaciones, separar ropa, ayudar a desalojar', NULL, '5 horas de voluntariado', '2026-08-13', 'Sarita Aristizabal', '3160561024', 'disponible', NULL, NULL, NULL, '2026-08-13 18:22:19'),
(52, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Soy pequeña, flexible, ágil. Construí viviendas de emergencia con TECHO.\r\nSoy muy buena organizando.\r\nPuedo ofrecer apoyo emocional, tengo formación.', NULL, '', '2026-08-13', 'Lorena Mejía', '3054754454', 'disponible', NULL, NULL, NULL, '2026-08-13 18:29:40'),
(53, NULL, 'manizales', 'Voluntariado / Mano de obra', '', NULL, '', '2026-08-13', 'Valentina de los rios mintoya', '3001698282', 'disponible', NULL, NULL, NULL, '2026-08-13 18:45:25'),
(54, NULL, 'manizales', 'Transporte / Vehículo', 'ofrezco turbo de 5tn para traer ayudas de medellin a manizales el dia sabado 15 de agosto', NULL, '5tn', '2026-08-13', 'alexandra ospina', '3014779922', 'disponible', NULL, NULL, NULL, '2026-08-13 19:17:01'),
(55, NULL, 'manizales', 'Otro', 'Materiales de construcción', NULL, '', '2026-08-13', 'Construcción', '3226278663 - 3195885129 - 3122579072', 'disponible', NULL, NULL, NULL, '2026-08-13 20:03:26'),
(56, NULL, 'manizales', 'Ropa / Cobijas', 'Ropa nueva y de segunda en excelente estado. \r\nBlusas tallas s.m.l.xl.\r\nPantalones tallas 8.10.12.\r\nZapatos (tenis) tallas 37.39. \r\nRopa interior nueva talla L.', 'img_6a7deb78aa5bf6.05828571.jpg', '20 kids de Ropa y zapatos.', '2026-08-13', 'Yesica Lorena Morales Bedoya', '3106948954', 'disponible', 'Meicy Tamayo', '3103626789', '2026-08-15', '2026-08-13 20:06:17'),
(57, '3766', 'manizales', 'Transporte / Vehículo', 'Tenemos un camión de la alcaldía de Viterbo que necesitamos llenar con donaciones. Si no saben a donde enviar sus donaciones pueden contactarnos', NULL, 'Camión hacia viterbo', '2026-08-14', 'Carlos Calderon', '+14017496336', 'disponible', NULL, NULL, NULL, '2026-08-14 21:39:05'),
(58, '5942', 'manizales', 'Ropa / Cobijas', 'Puedo donar ropa de hombre y de joven , también ropa de cama y dinero en efectivo ( tengo una pierna fracturada por eso no lo hago yo ) \r\n\r\nTambién podría prestar mi carro para transportar a quien necesite 3203735414', NULL, 'Ropa de hombre y de joven', '2026-08-14', 'Camilo Jaramillo', '3203735414', 'disponible', 'Diana Paola Ceballos Quintero', '3145797283', '2026-08-15', '2026-08-14 22:56:22'),
(59, '4461', 'manizales', 'Atención médica', 'Médico Pediatra consulta online totalmente Gratis', NULL, '', '2026-08-15', 'Nataliam.tupediatraencasa@gmail.com', '3148638646', 'disponible', NULL, NULL, NULL, '2026-08-15 00:05:36'),
(60, '3932', 'manizales', 'Atención médica', 'Si necesitas ayuda en tu salud mental o emocional, debido a la situación actual causada por el terremoto, estoy para ayudarte. Atención gratuita', NULL, '', '2026-08-15', 'Jhon fredy Gomez Ramirez', '3127917065', 'disponible', NULL, NULL, NULL, '2026-08-15 00:40:15'),
(61, '9578', 'manizales', 'Transporte / Vehículo', 'Mazda 2 ofrezco transportar personas y cosas que quepan en el carro', NULL, '', '2026-08-15', 'Diana Castellanos', '31460928160', 'disponible', NULL, NULL, NULL, '2026-08-15 01:33:39'),
(62, '3441', 'manizales', 'Voluntariado / Mano de obra', 'Pueedo cocinar, apoyo en logistica, empacando kits, organizacion en general y removiendo escombros', NULL, '', '2026-08-15', 'MARIA CAMILA BEDOYA', '3125735896', 'disponible', NULL, NULL, NULL, '2026-08-15 14:00:23'),
(63, '5920', 'manizales', 'Ropa / Cobijas', 'Cobijas, almohadas y toallas nuevas, y 2 juegos de sábanas usados en buen estado', 'img_6a8099028636f6.29817347.jpg', '8 cobijas, 8 toallas, 8 almohadas', '2026-08-15', 'Andrea Guarin', '3127927944', 'disponible', 'Diana Paola Ceballos Quintero', '3145797283', '2026-08-15', '2026-08-15 16:51:14'),
(64, '5775', 'pereira', 'Voluntariado / Mano de obra', 'Soy ingeniero civil, sin experiencia en patología, pero en curso de especialización en sismo-resistencia. También puedo servir como mano de obra para retiro de escombros o para llevar enceres en mi vehículo a lugares cercanos', NULL, 'Domingo 16 agosto, 7 horas', '2026-08-15', 'Luis Alejandro Pérez', '3007183681', 'disponible', NULL, NULL, NULL, '2026-08-15 18:43:35');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes_danos`
--

CREATE TABLE `reportes_danos` (
  `id` int(11) NOT NULL,
  `radicado` varchar(20) NOT NULL,
  `ciudad` varchar(50) NOT NULL DEFAULT 'manizales',
  `tipo_inmueble` varchar(50) NOT NULL,
  `direccion` varchar(200) NOT NULL,
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `habitado` enum('si','no','evacuado') NOT NULL DEFAULT 'si',
  `nivel_percibido` enum('leve','moderado','severo','colapso') NOT NULL DEFAULT 'moderado',
  `descripcion` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `nombre_reporta` varchar(150) NOT NULL,
  `telefono_reporta` varchar(50) NOT NULL,
  `cedula_reporta` varchar(30) DEFAULT NULL,
  `estado` enum('pendiente','visita_programada','visitado') NOT NULL DEFAULT 'pendiente',
  `fecha_visita` date DEFAULT NULL,
  `resultado_visita` varchar(150) DEFAULT NULL,
  `notas_admin` text DEFAULT NULL,
  `fecha` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `reportes_danos`
--

INSERT INTO `reportes_danos` (`id`, `radicado`, `ciudad`, `tipo_inmueble`, `direccion`, `lat`, `lng`, `habitado`, `nivel_percibido`, `descripcion`, `imagen`, `nombre_reporta`, `telefono_reporta`, `cedula_reporta`, `estado`, `fecha_visita`, `resultado_visita`, `notas_admin`, `fecha`, `created_at`) VALUES
(3, 'DA647255', 'manizales', 'Casa', 'Calle 16 #31-04', 5.0626457, -75.5227661, 'evacuado', 'colapso', 'Grietas visibles se cayó  un bloque pared por desprender', NULL, 'Yennifer giraldo', '3004547230', '1053811274', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 04:07:14'),
(4, 'DA581761', 'manizales', 'Edificio', 'Calle 11 #9-48 edificio Melany apto 301 Barrio Chipre', 5.0770405, -75.5244484, 'si', 'severo', 'Grietas profundas visibles en estructura, en el interior de apartamentos también en paredes', 'img_6a7f012218e957.21757128.jpg', 'Juan Felipe Villada Gallego', '3113860957', '1002547337', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 11:50:58'),
(5, 'DA604426', 'manizales', 'Casa', 'Cuchilla de los Santa, Finca Fátima', 5.0859578, -75.5380071, 'si', 'moderado', 'Caída de una pared, paredes sueltas, grietas en paredes, estructura deteriorada de la casa a punto de caerse.', NULL, 'Carmenza Enith Marín González', '3137894578', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 12:52:58'),
(6, 'DA267624', 'manizales', 'Casa', 'Vereda el águila sector Cairo', 5.1095513, -75.5103066, 'si', 'colapso', 'Riesgo colapso techo paredes \r\nCasa de bareque', 'img_6a7f156fb5bfb6.55216094.jpg', 'Jorge Guzmán', '3234840243', '1053844537', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 13:17:36'),
(7, 'DA919093', 'manizales', 'Casa', 'Viejoteca la linda casa # 4 camino viejo', 5.0643841, -75.5177879, 'si', 'colapso', 'La casa sedio y piso tiembla al caminar', NULL, 'Fabiola duque Marulanda', '3023364273', '30281964', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 13:18:53'),
(8, 'DA249510', 'manizales', 'Casa', 'Vereda Boston casa Konarka', 5.1052420, -75.5211120, 'si', 'moderado', 'Grietas visibles en paredes y piso grietas en la entrada', NULL, 'Christian Edwin Villa', '3227281855', '79490489', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 13:19:43'),
(9, 'DA904661', 'manizales', 'Edificio', 'Carrera 13 #9-79 edificio San Mateo', 5.0730774, -75.5259432, 'evacuado', 'colapso', 'Grietas, paredes caídas, escombros, está inclinado', NULL, 'Valentina Duque', '3136110195', '1053840558', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 13:29:14'),
(10, 'DA623108', 'manizales', 'Casa', 'Manzana 12 casa 109 por la estación de policía', 5.0916112, -75.5481746, 'si', 'moderado', 'Gritas en pardes', NULL, 'Maria Lucila Vargas', '3225290196', '30298559', 'pendiente', NULL, '', '', '2026-08-14', '2026-08-14 13:43:38'),
(11, 'DA977574', 'manizales', 'Apartamento', 'Carrera 23 62-85 edificio Riviera', 5.0670742, -75.5220761, 'evacuado', 'moderado', 'Grietas visibles', NULL, 'Erika buitrago', '3103639574', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 14:25:46'),
(12, 'DA029627', 'manizales', 'Casa', 'Calle 47. #29-70 barrio colombia', 5.0669694, -75.5019952, 'evacuado', 'severo', 'Se callo el segundo piso\r\nSe requiere\r\nCemento\r\nLadrillo\r\nHierro\r\nArena\r\nGravilla\r\nCarreta\r\nTubería\r\nEléctricos\r\nAlimentos', NULL, 'Jorge llano romero', '3137177062', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 14:32:10'),
(13, 'DA179437', 'manizales', 'Casa', 'Cra 23 #28-28 apto 202 centro', 5.0632251, -75.5124664, 'evacuado', 'severo', 'Grietas visibles, paredes a punto de caer, piso hundido', NULL, 'Manuela orozco castaño', '3113039118', '1002717519', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 14:37:25'),
(14, 'DA319308', 'manizales', 'Edificio', 'Cra 23 #65-79', 5.0557115, -75.4853117, 'evacuado', 'moderado', 'Los Apartamentos que están sobre la santander quedaron destruidos. Los departamentos de la falda están menos afectados (mi mamá vive ahi), pero el edificio está sin Agua y si Gas.. y con daños en las paredes del edificio. Estamos esperando que vayan a hacer la revisión formal de la estructura', 'img_6a7f2f1c408126.21436767.jpg', 'Adriana Cardona', '3052209263', '30230312', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 15:07:08'),
(15, 'DA756783', 'manizales', 'Edificio', 'Calle 65 # 30c 35', 5.0539834, -75.4952762, 'evacuado', 'moderado', 'Grietas, pedazos de pared desprendidos.', 'img_6a7f34271feee8.58338127.jpg', 'Marian Ospina Castillo', '3128125100', '1002596886', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 15:28:39'),
(16, 'DA013125', 'manizales', 'Casa', 'Carrera 41 # 67-09', 5.1862247, -75.5066798, 'si', 'moderado', 'Grietas visibles en vigas que sostienen el techo con separación de aproximadamente 1 cms y baldosas fracturadas paralelo a esta viga', 'img_6a7f3911278af8.59219272.jpg', 'Juliana mejia', '3124419546', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 15:49:37'),
(17, 'DA848926', 'manizales', 'Edificio', 'Calle 12 # 13-07, Edificio cobadonga', 5.0737387, -75.5248904, 'si', 'severo', 'Daño más grave en el último piso, material del penthouse cae sobre techo del apartamento 501 y compromete pared, se han retirado escombros y se está demoliendo la pared, a espera de reporte estructural', 'img_6a7f4ad064a176.91982855.jpg', 'Luz Mery Martinez', '3137014426', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 17:05:20'),
(18, 'DA104302', 'manizales', 'Casa', 'CALLE 41A # 25 - 21', 5.0647350, -75.5045298, 'evacuado', 'colapso', 'Grietas en las columnas y vigas', 'img_6a7f59efbf4426.47305307.jpg', 'VALERIA GONZALEZ HERNANDEZ', '3053076007', '1192904251', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 18:09:51'),
(19, 'DA072644', 'manizales', 'Casa', 'CRA 31a # 30a-54', 5.0627615, -75.5115060, 'si', 'leve', 'Grietas visibles en la pared de la habitación, en la terraza y en las escaleras', NULL, 'Yesica López Toro', '3054732093', '1010110546', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 18:28:23'),
(20, 'DA272719', 'manizales', 'Local comercial', 'cll 20A21-11 pasaje de la beneficencia - cafe del pasaje', 5.0690045, -75.5159426, 'si', 'severo', 'daño en pared y piden no poder nada para que no se caiga, establecimiento comercial', 'img_6a7f8b15895e58.58563478.jpg', 'diana Pulgarín Carvajal', '3124769547', '52777115', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 21:39:33'),
(21, 'DA898503', 'manizales', 'Casa', 'calle 21 # 28 - 19, dentro del callejón barrio 20 de julio', 5.0635662, -75.5179900, 'si', 'colapso', 'Grietas en columnas, en paredes, cayó el techo, cada en bareque', NULL, 'Laura Vanessa López Villa', '3017843982', '1007234163', 'pendiente', NULL, NULL, NULL, '2026-08-15', '2026-08-15 00:14:15'),
(22, 'DA813002', 'manizales', 'Casa', 'Vereda el aventino bajo tablazo casa', 5.0322644, -75.5389342, 'si', 'moderado', 'Grietas visibles en habitación baño piso \r\nFractura por la mitad de la casa', NULL, 'Angela Ballesteros', '3216046077', '', 'pendiente', NULL, NULL, NULL, '2026-08-15', '2026-08-15 03:03:10'),
(23, 'DA595462', 'manizales', 'Casa', 'Calle 37 #26a-02', 5.0654080, -75.5084566, 'si', 'severo', 'Grietas visibles en la parte de afuera de la casa , grietas en paredes internas', NULL, 'Paula Andrea zapata', '3205366581', '1053872733', 'pendiente', NULL, NULL, NULL, '2026-08-15', '2026-08-15 04:12:57'),
(24, 'DA873143', 'manizales', 'Casa', 'Call 39 #25-63 Villanueva', 5.0645033, -75.5073863, 'si', 'moderado', 'Grietas en paredes, sin techo', 'img_6a807ee5b51999.46748416.jpg', 'Miguel', '3166001429', '', 'pendiente', NULL, NULL, NULL, '2026-08-15', '2026-08-15 14:59:50'),
(25, 'DA773597', 'manizales', 'Casa', 'Karrera 20#31-17', 5.0664395, -75.5109215, 'si', 'moderado', 'fisuras, grietas, paredes, columnas y vigas, perdida techo total', NULL, 'Paula Zapata', '3202500592', '', 'pendiente', NULL, NULL, NULL, '2026-08-15', '2026-08-15 18:10:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sectores`
--

CREATE TABLE `sectores` (
  `id` int(11) NOT NULL,
  `ciudad` varchar(50) NOT NULL DEFAULT 'manizales',
  `nombre` varchar(150) NOT NULL,
  `barrio` varchar(150) DEFAULT NULL,
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `nivel_afectacion` enum('leve','moderado','severo') NOT NULL DEFAULT 'moderado',
  `estado` enum('activo','cerrado') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sectores`
--

INSERT INTO `sectores` (`id`, `ciudad`, `nombre`, `barrio`, `lat`, `lng`, `descripcion`, `nivel_afectacion`, `estado`, `created_at`) VALUES
(1, 'manizales', 'Centro Histórico', 'Plaza de Bolívar', 5.0689000, -75.5174000, 'Zona con daños estructurales en la Catedral y edificios aledaños.', 'severo', 'activo', '2026-08-13 16:52:30'),
(2, 'manizales', 'Barrio la Linda  panadería pegazo', '', 5.0917846, -75.5460924, '', 'moderado', 'activo', '2026-08-13 18:42:04'),
(3, 'manizales', 'Villamaria caldas', '', 5.0654783, -75.4862438, '', 'moderado', 'activo', '2026-08-13 19:02:14'),
(4, 'manizales', 'Avanzada', '', 5.0763934, -75.5140838, '', 'moderado', 'activo', '2026-08-13 19:03:41'),
(5, 'manizales', 'Torre del Cable', '', 5.0560099, -75.4866788, '', 'moderado', 'activo', '2026-08-13 19:10:54'),
(6, 'pereira', 'centro', '', 4.8133673, -75.6910372, '', 'moderado', 'activo', '2026-08-13 19:13:20'),
(7, 'manizales', 'Diagonal al CAI barrio el Nevado', '', 5.0610025, -75.5145961, '', 'moderado', 'activo', '2026-08-13 19:21:17'),
(8, 'manizales', 'Facultad de Arquitectura', '', 5.0552249, -75.4859161, '', 'moderado', 'activo', '2026-08-13 19:31:59'),
(9, 'manizales', 'las delicias', '', 5.0687406, -75.5102348, '', 'moderado', 'activo', '2026-08-13 19:51:37'),
(10, 'manizales', 'La Aurora', '', 5.0728561, -75.5466712, '', 'moderado', 'activo', '2026-08-13 20:01:42'),
(11, 'cali', 'Chiminangos II', '', 3.4765504, -76.4940798, '', 'moderado', 'activo', '2026-08-13 20:06:02'),
(12, 'cali', 'calle 5 #43- 65', '', 3.4201252, -76.5479305, '', 'moderado', 'activo', '2026-08-13 20:18:05'),
(13, 'manizales', 'Apoyo a familia en Villa Pilar', '', 5.0684113, -75.5043286, '', 'moderado', 'activo', '2026-08-13 20:58:00'),
(14, 'cali', 'edificio Los Colores', '', 3.4223715, -76.5422791, '', 'moderado', 'activo', '2026-08-13 21:24:37'),
(15, 'pereira', 'Pinares Médica calle 9 #20-60', '', 4.8019600, -75.6866464, '', 'moderado', 'activo', '2026-08-13 21:56:53'),
(16, 'manizales', 'Casa del Abuelo Divino Niño', '', 5.0404137, -75.5132174, '', 'moderado', 'activo', '2026-08-13 22:09:35'),
(17, 'manizales', 'Vecinos de Estambul', '', 5.0529525, -75.5255181, '', 'moderado', 'activo', '2026-08-13 22:20:41'),
(18, 'manizales', 'Topacio', '', 5.0730574, -75.5308449, '', 'moderado', 'activo', '2026-08-13 22:31:20'),
(19, 'manizales', 'Parque del agua Manizales', '', 5.0432592, -75.5148367, '', 'moderado', 'activo', '2026-08-13 23:43:56'),
(20, 'manizales', 'Parque del agua Manizales', '', 5.0432592, -75.5148367, '', 'moderado', 'activo', '2026-08-13 23:43:58'),
(21, 'manizales', 'Carrera 29 #38-18 villa nueva', '', 5.0607848, -75.5075760, '', 'moderado', 'activo', '2026-08-14 03:28:35'),
(22, 'manizales', 'Enea', '', 5.0621622, -75.5156314, '', 'moderado', 'activo', '2026-08-14 03:32:29'),
(23, 'manizales', 'Los agustinos', '', 5.0712379, -75.5217147, '', 'moderado', 'activo', '2026-08-14 17:14:33'),
(24, 'manizales', 'Los agustinos', '', 5.0712379, -75.5217147, '', 'moderado', 'activo', '2026-08-14 17:14:35'),
(25, 'manizales', 'Centro de villamaria', 'Otro número de teléfono', 5.0464708, -75.5141385, '3007824558', 'moderado', 'activo', '2026-08-14 17:45:32'),
(26, 'manizales', 'Centro de villamaria', 'Otro número de teléfono', 5.0464708, -75.5141385, '3007824558', 'moderado', 'activo', '2026-08-14 17:45:39'),
(27, 'manizales', 'Centro de villamaria', 'Otro número de teléfono', 5.0464708, -75.5141385, '3007824558', 'moderado', 'activo', '2026-08-14 17:45:39'),
(28, 'manizales', 'Viviendas afectadas La Unión Valle', '', 4.5312867, -76.1017656, '', 'moderado', 'activo', '2026-08-14 18:14:45'),
(29, 'manizales', 'El nevado', '', 5.0596255, -75.5136979, '', 'moderado', 'activo', '2026-08-14 19:08:59'),
(30, 'manizales', 'Fundadores', '', 5.0688794, -75.5104253, '', 'moderado', 'activo', '2026-08-14 20:09:39'),
(31, 'manizales', 'Plaza de Bolivar', '', 5.0680896, -75.5173641, '', 'moderado', 'activo', '2026-08-13 03:55:42'),
(32, 'manizales', 'Las Américas', '', 5.0719170, -75.5226445, '', 'moderado', 'activo', '2026-08-13 04:30:17'),
(33, 'manizales', 'Parque Caldas', '', 5.0674991, -75.5120158, '', 'moderado', 'activo', '2026-08-13 04:39:05'),
(34, 'manizales', 'Mateguadua casa 81a', '', 5.1013634, -75.5099932, '', 'moderado', 'activo', '2026-08-13 05:02:39'),
(35, 'manizales', 'Cancha Auxiliar', '', 5.0578328, -75.4891366, '', 'moderado', 'activo', '2026-08-13 05:15:51'),
(36, 'manizales', 'Carrera 23', '', 5.0671434, -75.5149698, '', 'moderado', 'activo', '2026-08-13 05:27:10'),
(37, 'manizales', 'CRA 23 #26-29. Piso 2', '', 5.0674312, -75.5150217, '', 'moderado', 'activo', '2026-08-13 05:27:22'),
(38, 'manizales', 'Vereda el arenillo', '', 5.0534682, -75.5453449, '', 'moderado', 'activo', '2026-08-13 05:32:56'),
(39, 'manizales', 'Vereda Pueblo Hondo', '', 5.1468022, -75.4991240, '', 'moderado', 'activo', '2026-08-13 05:37:38'),
(40, 'manizales', 'La escombrera', '', 5.0613017, -75.5096235, '', 'moderado', 'activo', '2026-08-13 05:40:39'),
(41, 'manizales', 'Chipre - Edificio Andalucía', '', 5.0725685, -75.5248153, '', 'moderado', 'activo', '2026-08-13 05:45:35'),
(42, 'manizales', 'Villamaría', '', 5.0447024, -75.5139199, '', 'moderado', 'activo', '2026-08-13 06:13:47'),
(43, 'manizales', 'Milan', '', 5.0481502, -75.4830775, '', 'moderado', 'activo', '2026-08-13 06:15:52'),
(44, 'manizales', 'La rambla', '', 5.0595628, -75.4868853, '', 'moderado', 'activo', '2026-08-13 06:38:10'),
(45, 'manizales', 'COLISEO UNIVERSIDAD DE CALDAS', '', 5.0587428, -75.4915345, '', 'moderado', 'activo', '2026-08-13 06:39:18'),
(46, 'manizales', 'Villamaria, sector principal', '', 5.0441590, -75.5102581, '', 'moderado', 'activo', '2026-08-13 06:55:48'),
(47, 'manizales', 'Mirador de Las Lomas, Mz 26, Casa 15', '', 5.0387705, -75.5130136, '', 'moderado', 'activo', '2026-08-13 07:00:06'),
(48, 'manizales', 'Colombia, carrera 30# 48-18', 'La Estación', 5.0606193, -75.5037773, '', 'moderado', 'activo', '2026-08-13 07:02:04'),
(49, 'manizales', 'Carrera 23 #62-85', '', 5.0584537, -75.4866637, '', 'moderado', 'activo', '2026-08-13 07:04:48'),
(50, 'manizales', 'la aurora', '', 5.1456915, -75.5171143, '', 'moderado', 'activo', '2026-08-13 09:00:34'),
(51, 'manizales', '20 de Julio', '', 5.0607372, -75.5223799, '', 'moderado', 'activo', '2026-08-13 09:10:03'),
(52, 'manizales', 'Las delicias', '', 5.0702091, -75.5103791, '', 'moderado', 'activo', '2026-08-13 14:48:14'),
(53, 'manizales', 'La Camelia Cra 23 No 69 a 63 Edificio San Martín 2', 'Comuna Palogrande', 5.0654082, -75.5176163, '', 'severo', 'activo', '2026-08-13 15:25:32'),
(54, 'manizales', 'La Camelia Cra 23 No 69 a 63 Edificio San Martín 2', 'Comuna Palogrande', 5.0654082, -75.5176163, '', 'severo', 'activo', '2026-08-13 15:25:33'),
(55, 'manizales', 'Sacatin de villapilar', '', 5.0903601, -75.5298392, '', 'moderado', 'activo', '2026-08-13 16:35:03'),
(56, 'manizales', 'Alto tablazo', '', 5.0428528, -75.5333161, '', 'moderado', 'activo', '2026-08-13 16:55:34'),
(57, 'manizales', 'Bajo tablazo', '', 5.0290873, -75.5378844, '', 'moderado', 'activo', '2026-08-13 16:57:34'),
(58, 'manizales', 'San José', 'Por la cuadra de Burguer Parilla', 5.0733219, -75.5159882, 'Una de las viviendas está por colapsar. Otra debe retirar sus pertenencias por riesgo de colapso.', 'severo', 'activo', '2026-08-13 16:57:55'),
(59, 'manizales', 'Villamaria', '', 5.0432558, -75.5087471, '', 'moderado', 'activo', '2026-08-13 17:04:14'),
(60, 'manizales', 'Campo amor', '', 5.0628179, -75.5133015, '', 'moderado', 'activo', '2026-08-13 18:28:59'),
(61, 'manizales', 'Campo amor', '', 5.0628430, -75.5134875, '', 'moderado', 'activo', '2026-08-13 18:31:13'),
(62, 'manizales', 'Milan', '', 5.0458949, -75.4797940, '', 'moderado', 'activo', '2026-08-13 18:31:57'),
(63, 'manizales', '20 de Julio', '', 5.0625307, -75.5183065, '', 'moderado', 'activo', '2026-08-13 18:34:53'),
(64, 'manizales', 'Camino Viejo Hacia la salida de villamaria', '', 5.0505906, -75.5156207, '', 'moderado', 'activo', '2026-08-13 18:43:41'),
(65, 'manizales', 'Barrio 20 de julio', '', 5.0637384, -75.5180803, 'Caida de techo, columnas, casa en bareque en un abismo', 'severo', 'activo', '2026-08-13 18:49:38'),
(66, 'pereira', 'el porvenir', '', 4.8147636, -75.6939125, '', 'moderado', 'activo', '2026-08-13 18:49:53'),
(67, 'manizales', '20 de Julio', '', 5.0632067, -75.5180347, '', 'moderado', 'activo', '2026-08-13 18:50:01'),
(68, 'pereira', 'Villavicencio', '', 4.8111543, -75.6825829, '', 'moderado', 'activo', '2026-08-13 18:53:36'),
(69, 'manizales', 'Camino Viejo Hacia la salida de villamaria', '', 5.0506387, -75.5155510, '', 'moderado', 'activo', '2026-08-13 19:06:52'),
(70, 'manizales', 'Camino viejo hacie la salida de villamaría', '', 5.0506975, -75.5154115, '', 'moderado', 'activo', '2026-08-13 19:13:11'),
(71, 'manizales', 'Fatima', '', 5.0507971, -75.4977686, '', 'moderado', 'activo', '2026-08-13 19:38:30'),
(72, 'manizales', '20 de Julio', '', 5.0642006, -75.5181259, '', 'moderado', 'activo', '2026-08-13 19:47:54'),
(73, 'manizales', 'Barrio Galán', '', 5.0775532, -75.5124879, '', 'moderado', 'activo', '2026-08-13 19:48:49'),
(74, 'manizales', '20 de julio', '', 5.0640029, -75.5181366, '', 'moderado', 'activo', '2026-08-13 19:50:13'),
(75, 'manizales', '20 de Julio', '', 5.0643289, -75.5181420, '', 'moderado', 'activo', '2026-08-13 19:52:15'),
(76, 'manizales', '20 de Julio', '', 5.0643289, -75.5181420, '', 'moderado', 'activo', '2026-08-13 19:52:18'),
(77, 'manizales', 'Arquitectura', '', 5.0556430, -75.4860950, '', 'moderado', 'activo', '2026-08-13 19:59:25'),
(78, 'armenia', 'Cra 27 #31-06 Las Américas', '', 4.5257216, -75.6439859, '', 'moderado', 'activo', '2026-08-14 21:32:20'),
(79, 'manizales', 'ALTO PERSIA', '', 5.0591050, -75.5025822, '', 'moderado', 'activo', '2026-08-15 00:46:29'),
(80, 'manizales', 'El Arenillo', '', 5.0640322, -75.5366730, '', 'leve', 'activo', '2026-08-15 01:23:41'),
(81, 'manizales', 'La linda', '', 5.0917321, -75.5460879, '', 'moderado', 'activo', '2026-08-15 01:24:31'),
(82, 'manizales', 'Bajo tablazo', '', 5.0586529, -75.5510902, '', 'moderado', 'activo', '2026-08-15 01:43:16'),
(83, 'manizales', 'Bajo tablazo', '', 5.0684069, -75.5213928, '', 'moderado', 'activo', '2026-08-15 01:47:46'),
(84, 'norte_valle', 'Barrio la plazuela   Cra 22#23-18', '', 4.2180028, -76.3175958, '', 'moderado', 'activo', '2026-08-15 02:13:06'),
(85, 'manizales', 'Vereda PORTACHUELO', 'Vereda ubicada a una hora de Salamina', 5.4267120, -75.4755020, 'La vivienda está afectada es en bahareque y teja de barro en zona rural. Al lado de la casa hay un lugar para adecuar con tejas de zinc o eternit mientras se puede intervenir la casa que puede colapsar', 'moderado', 'activo', '2026-08-15 03:15:09'),
(86, 'manizales', 'Comuna San José / La Avanzada', '', 5.0744258, -75.5159377, '', 'moderado', 'activo', '2026-08-15 14:31:00'),
(87, 'manizales', 'Barrio la linda', 'Comuna atardeceres', 5.0925714, -75.5430270, 'Ya se removieron la mayoría de escombros.', 'severo', 'activo', '2026-08-15 14:51:05'),
(88, 'manizales', 'Vereda Cuchilla de los Santa', 'Vereda el remanso', 5.0849620, -75.5412496, 'Grietas en paredes, techo colapsado, ramada colapsada, requieren elementos de construcción y protección', 'moderado', 'activo', '2026-08-15 15:00:34'),
(89, 'manizales', 'Belén  Av paralela #56-83', '', 5.0591867, -75.4930254, '', 'moderado', 'activo', '2026-08-15 16:24:58'),
(90, 'manizales', 'Barrio Samaria por el acentamiento', '', 5.0794054, -75.4859515, '', 'moderado', 'activo', '2026-08-15 17:19:49'),
(91, 'manizales', 'Barrio Jesús de la buena esperanza', '', 5.0609565, -75.5233685, '', 'moderado', 'activo', '2026-08-15 17:41:41'),
(92, 'manizales', 'Barrio Jesús de la buena esperanza calle 16 con cra 32 #31-66', '', 5.0613341, -75.5213678, '', 'moderado', 'activo', '2026-08-15 18:09:10'),
(93, 'manizales', 'La Estrella', '', 5.0606861, -75.4886645, '', 'moderado', 'activo', '2026-08-15 18:27:31'),
(94, 'manizales', 'BAJO TABLAZO', '', 5.0595251, -75.5502748, '', 'moderado', 'activo', '2026-08-15 18:56:36'),
(95, 'manizales', 'SECTOR EL TOPACIO Y SUS ALREDEDORES', '', 5.0571312, -75.5496311, '', 'moderado', 'activo', '2026-08-15 19:01:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `viviendas`
--

CREATE TABLE `viviendas` (
  `id` int(11) NOT NULL,
  `pin` varchar(10) DEFAULT NULL,
  `ciudad` varchar(50) NOT NULL DEFAULT 'manizales',
  `tipo` enum('gratis','alquiler') NOT NULL DEFAULT 'gratis',
  `precio` varchar(100) DEFAULT NULL,
  `capacidad` varchar(100) DEFAULT NULL,
  `tiempo_disponible` varchar(150) DEFAULT NULL,
  `sector_referencia` varchar(150) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `estado` enum('disponible','ocupado') NOT NULL DEFAULT 'disponible',
  `nombre_ofrece` varchar(150) NOT NULL,
  `telefono_ofrece` varchar(50) NOT NULL,
  `interesado_nombre` varchar(150) DEFAULT NULL,
  `interesado_telefono` varchar(50) DEFAULT NULL,
  `fecha_interes` date DEFAULT NULL,
  `fecha` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `centros_acopio`
--
ALTER TABLE `centros_acopio`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_centros_ciudad` (`ciudad`);

--
-- Indices de la tabla `contactos`
--
ALTER TABLE `contactos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sector_id` (`sector_id`);

--
-- Indices de la tabla `mascotas_perdidas`
--
ALTER TABLE `mascotas_perdidas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mascotas_ciudad` (`ciudad`);

--
-- Indices de la tabla `necesidades`
--
ALTER TABLE `necesidades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sector_id` (`sector_id`);

--
-- Indices de la tabla `noticias`
--
ALTER TABLE `noticias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_noticias_ciudad` (`ciudad`);

--
-- Indices de la tabla `ofrecimientos`
--
ALTER TABLE `ofrecimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ofrecimientos_ciudad` (`ciudad`);

--
-- Indices de la tabla `reportes_danos`
--
ALTER TABLE `reportes_danos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `radicado` (`radicado`),
  ADD KEY `idx_danos_ciudad` (`ciudad`),
  ADD KEY `idx_danos_radicado` (`radicado`);

--
-- Indices de la tabla `sectores`
--
ALTER TABLE `sectores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sectores_ciudad` (`ciudad`);

--
-- Indices de la tabla `viviendas`
--
ALTER TABLE `viviendas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_viviendas_ciudad` (`ciudad`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `centros_acopio`
--
ALTER TABLE `centros_acopio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `contactos`
--
ALTER TABLE `contactos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT de la tabla `mascotas_perdidas`
--
ALTER TABLE `mascotas_perdidas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `necesidades`
--
ALTER TABLE `necesidades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

--
-- AUTO_INCREMENT de la tabla `noticias`
--
ALTER TABLE `noticias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `ofrecimientos`
--
ALTER TABLE `ofrecimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT de la tabla `reportes_danos`
--
ALTER TABLE `reportes_danos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `sectores`
--
ALTER TABLE `sectores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT de la tabla `viviendas`
--
ALTER TABLE `viviendas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `contactos`
--
ALTER TABLE `contactos`
  ADD CONSTRAINT `contactos_ibfk_1` FOREIGN KEY (`sector_id`) REFERENCES `sectores` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `necesidades`
--
ALTER TABLE `necesidades`
  ADD CONSTRAINT `necesidades_ibfk_1` FOREIGN KEY (`sector_id`) REFERENCES `sectores` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
