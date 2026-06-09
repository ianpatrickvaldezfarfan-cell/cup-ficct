<?php
namespace App\Helpers;

class PasswordHelper
{
    /**
     * Genera una contraseña de 8 caracteres con al menos:
     * 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
     */
    public static function generar(): string
    {
        $mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $minusculas = 'abcdefghjkmnpqrstuvwxyz';
        $numeros    = '23456789';
        $especiales = '@#$%&*!';

        $chars = [
            $mayusculas[random_int(0, strlen($mayusculas) - 1)],
            $mayusculas[random_int(0, strlen($mayusculas) - 1)],
            $minusculas[random_int(0, strlen($minusculas) - 1)],
            $minusculas[random_int(0, strlen($minusculas) - 1)],
            $numeros[random_int(0, strlen($numeros) - 1)],
            $numeros[random_int(0, strlen($numeros) - 1)],
            $especiales[random_int(0, strlen($especiales) - 1)],
            $especiales[random_int(0, strlen($especiales) - 1)],
        ];

        shuffle($chars);
        return implode('', $chars);
    }
}
