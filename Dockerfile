FROM php:8.3-apache

# Driver MySQL para PDO (necesario para conectar con el contenedor db)
RUN docker-php-ext-install pdo_mysql
