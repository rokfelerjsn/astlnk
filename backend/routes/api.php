<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuildingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\TechnicianController;
use App\Http\Controllers\Api\TicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes (No Authentication Required)
|--------------------------------------------------------------------------
*/

Route::get('/rooms/{room}', [RoomController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::post('/tickets', [TicketController::class, 'store']);
Route::get('/tickets/{code}/track', [TicketController::class, 'track']);

/*
|--------------------------------------------------------------------------
| Auth Routes
|--------------------------------------------------------------------------
*/

Route::post('/auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Admin API Routes (Sanctum Protected)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Master Data CRUD
    Route::apiResource('admin/buildings', BuildingController::class);
    Route::apiResource('admin/rooms', RoomController::class)->except(['show']);
    Route::apiResource('admin/categories', CategoryController::class);
    Route::apiResource('admin/technicians', TechnicianController::class);

    // Room QR Generation
    Route::post('/admin/rooms/{room}/qr', [RoomController::class, 'generateQr']);

    // Ticket Management
    Route::get('/admin/tickets', [TicketController::class, 'index']);
    Route::get('/admin/tickets/{ticket}', [TicketController::class, 'show']);
    Route::patch('/admin/tickets/{ticket}/status', [TicketController::class, 'updateStatus']);
    Route::patch('/admin/tickets/{ticket}/assign', [TicketController::class, 'assign']);

    // Analytics
    Route::get('/admin/analytics', [AnalyticsController::class, 'index']);
});
