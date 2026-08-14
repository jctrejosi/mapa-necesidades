-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 14-08-2026 a las 12:17:26
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
(21, 22, 'Manuela duque', '3183049437', '', '2026-08-14 03:32:29');

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
(1, NULL, 'manizales', '', 'Gato', 'Negrita con manchas blancas y café en la carita y patas blancas', 'img_6a7e147e4197f8.59388331.jpg', 5.0469410, -75.5098915, 'Villamaria mirador de las lomas', '2026-08-13', 'encontrado', 'No se conoce', '3145820407', NULL, NULL, NULL, '2026-08-13 19:01:18');

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
(20, '6331', 22, 'Ropa / Cobijas', 'Se necesita ropa para un muchacho talla m- pantalón 34- zapatos 39 y su hija pequeña de 5-6 años perdieron absolutamente todo en villa Maria, también se recibe implementos  de aseo y un mercado', NULL, '2026-08-14', '3', 'alta', 'requiere', NULL, NULL, NULL, 'Manuela duque', '3183049437', '2026-08-14 03:32:29');

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
(5, NULL, 'manizales', 'Medicamentos', 'Estoy gestionando el tema de medicamentos, con formula médica.', NULL, '', '2026-08-13', 'Sonia', '3218069233 o 3105127975', 'disponible', NULL, NULL, NULL, '2026-08-13 19:01:09'),
(6, NULL, 'manizales', 'Transporte / Vehículo', 'Vehículo pequeño', NULL, '1', '2026-08-13', 'Ana Victoria Jaramillo Rivera', '3147531573', 'disponible', NULL, NULL, NULL, '2026-08-13 19:04:25'),
(7, NULL, 'manizales', 'Transporte / Vehículo', 'Ofrezco vehículo Mazda 2 en Manizales para ayudar a  transportar personas', NULL, '1', '2026-08-13', 'Héctor Vasquez', '3103972579', 'disponible', NULL, NULL, NULL, '2026-08-13 19:15:36'),
(8, NULL, 'quibdo', 'Voluntariado / Mano de obra', 'Soy Psicóloga dispuesta a viajar y apoyar y ofrecer servicios de primeros auxilios psicológicos', NULL, 'Dos días', '2026-08-13', 'Mayerly Alejandra Supelano Fino', '3007801987', 'disponible', NULL, NULL, NULL, '2026-08-13 19:51:37'),
(9, NULL, 'manizales', 'Transporte / Vehículo', 'Pongo a disposición mi vehículo particular por si alguien puede ser útil para transportar ayudas, alimentos, personas o trasteos pequeños.', NULL, 'Cuento con un vehículo particular (Nissan March)', '2026-08-13', 'Juan Esteban López', '3122427175', 'disponible', NULL, NULL, NULL, '2026-08-13 19:55:00'),
(10, NULL, 'manizales', 'Voluntariado / Mano de obra', 'Tengo una pica para ayudar a partir bloques grandes de escombros, pero para cualquier otra cosa que necesiten mano de obra estoy disponible', 'img_6a7e2bba688af9.92587874.jpg', 'Remoción de escombros o movimiento de paquetes, etc', '2026-08-13', 'Diego', '3105418451', 'disponible', NULL, NULL, NULL, '2026-08-13 20:40:26'),
(11, NULL, 'manizales', 'Atención médica', 'Soy Lic en Psicología atendiendo catastrofes', NULL, '', '2026-08-13', 'Grachu', '541151500059', 'disponible', NULL, NULL, NULL, '2026-08-13 21:03:42'),
(12, NULL, 'manizales', 'Alimentos', '24 algos para voluntarios', 'img_6a7e4b4385a033.14378964.jpg', 'Algos para voluntarios', '2026-08-13', 'Juan Manuel Betancurt', '3113658359', 'disponible', NULL, NULL, NULL, '2026-08-13 22:54:59'),
(13, NULL, 'manizales', 'Otro', '10 pares de guantes para escombros\r\n10 tapabocas para polvo', 'img_6a7e4be59bd186.64878390.jpg', 'Insumo para trabajo', '2026-08-13', 'Juan Manuel Betancurt', '3113658359', 'disponible', NULL, NULL, NULL, '2026-08-13 22:57:41'),
(14, '5133', 'manizales', 'Otro', 'Psicologa, buscas un espacio para ser escuchad@, comprendid@ y poder acompañarte  a transitar este proceso?... Te ofrezco de manera gratuita mi acompañamiento en este momento de emergencia', NULL, 'Virtual, telefónico', '2026-08-13', 'Claudia pescador', '3009001680', 'disponible', NULL, NULL, NULL, '2026-08-13 23:48:41'),
(15, '1379', 'manizales', 'Voluntariado / Mano de obra', 'Puedo ayudar en las zonas de Manizales y Pereira o cercanos a cualquiera de las 2 ciudades', NULL, 'Disponible viernes, sábado y domingo', '2026-08-14', 'Mariana Álvarez', '3046625818', 'disponible', NULL, NULL, NULL, '2026-08-14 02:21:19'),
(16, '3480', 'manizales', 'Voluntariado / Mano de obra', 'Mano de obra en centros de acopio, pongo mi carro a disposición los días que no son de pico y placa , para móviles personas , repartir', NULL, 'Puedo ayudar en centros de acopio, pongo también mi carro a disposición los días que no tengo pico y', '2026-08-14', 'Sandra', '3158114179', 'disponible', NULL, NULL, NULL, '2026-08-14 14:04:06'),
(17, '4111', 'manizales', 'Refugio / Carpas', 'Hola tengo dos carpas resisten poca agua pero pueden ser muy útiles en este momento para refugiarse, son de 4 personas cada una', NULL, '2', '2026-08-14', 'Veronica Quintero', '3203343003', 'disponible', NULL, NULL, NULL, '2026-08-14 14:15:48'),
(18, '3374', 'manizales', 'Otro', 'Tapabocas con filtros y bolsas de alta densidad', NULL, '50', '2026-08-14', 'Diana sierra', '3128335083', 'disponible', NULL, NULL, NULL, '2026-08-14 15:10:09'),
(19, '7169', 'manizales', 'Otro', 'Ingeniero civil ofrece ayuda para evaluar el estado de casas o apartamentos , comunicarse por WhatsApp', NULL, '', '2026-08-14', 'Julián Ortiz', '+33789985101', 'disponible', NULL, NULL, NULL, '2026-08-14 15:58:22');

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
(10, 'DA623108', 'manizales', 'Casa', 'Manzana 12 casa 109 por la estación de policía', 5.0916112, -75.5481746, 'si', 'moderado', 'Gritas en pardes', NULL, 'Maria Lucila Vargas', '3225290196', '30298559', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 13:43:38'),
(11, 'DA977574', 'manizales', 'Apartamento', 'Carrera 23 62-85 edificio Riviera', 5.0670742, -75.5220761, 'evacuado', 'moderado', 'Grietas visibles', NULL, 'Erika buitrago', '3103639574', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 14:25:46'),
(12, 'DA029627', 'manizales', 'Casa', 'Calle 47. #29-70 barrio colombia', 5.0669694, -75.5019952, 'evacuado', 'severo', 'Se callo el segundo piso\r\nSe requiere\r\nCemento\r\nLadrillo\r\nHierro\r\nArena\r\nGravilla\r\nCarreta\r\nTubería\r\nEléctricos\r\nAlimentos', NULL, 'Jorge llano romero', '3137177062', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 14:32:10'),
(13, 'DA179437', 'manizales', 'Casa', 'Cra 23 #28-28 apto 202 centro', 5.0632251, -75.5124664, 'evacuado', 'severo', 'Grietas visibles, paredes a punto de caer, piso hundido', NULL, 'Manuela orozco castaño', '3113039118', '1002717519', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 14:37:25'),
(14, 'DA319308', 'manizales', 'Edificio', 'Cra 23 #65-79', 5.0557115, -75.4853117, 'evacuado', 'moderado', 'Los Apartamentos que están sobre la santander quedaron destruidos. Los departamentos de la falda están menos afectados (mi mamá vive ahi), pero el edificio está sin Agua y si Gas.. y con daños en las paredes del edificio. Estamos esperando que vayan a hacer la revisión formal de la estructura', 'img_6a7f2f1c408126.21436767.jpg', 'Adriana Cardona', '3052209263', '30230312', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 15:07:08'),
(15, 'DA756783', 'manizales', 'Edificio', 'Calle 65 # 30c 35', 5.0539834, -75.4952762, 'evacuado', 'moderado', 'Grietas, pedazos de pared desprendidos.', 'img_6a7f34271feee8.58338127.jpg', 'Marian Ospina Castillo', '3128125100', '1002596886', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 15:28:39'),
(16, 'DA013125', 'manizales', 'Casa', 'Carrera 41 # 67-09', 5.1862247, -75.5066798, 'si', 'moderado', 'Grietas visibles en vigas que sostienen el techo con separación de aproximadamente 1 cms y baldosas fracturadas paralelo a esta viga', 'img_6a7f3911278af8.59219272.jpg', 'Juliana mejia', '3124419546', '', 'pendiente', NULL, NULL, NULL, '2026-08-14', '2026-08-14 15:49:37');

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
(22, 'manizales', 'Enea', '', 5.0621622, -75.5156314, '', 'moderado', 'activo', '2026-08-14 03:32:29');

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT de la tabla `mascotas_perdidas`
--
ALTER TABLE `mascotas_perdidas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `necesidades`
--
ALTER TABLE `necesidades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `noticias`
--
ALTER TABLE `noticias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `ofrecimientos`
--
ALTER TABLE `ofrecimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `reportes_danos`
--
ALTER TABLE `reportes_danos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `sectores`
--
ALTER TABLE `sectores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

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
