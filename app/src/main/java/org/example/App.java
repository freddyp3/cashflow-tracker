package org.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the archivelol Spring Boot application.
 *
 * <p>This application provides a REST API for managing an e-commerce reselling business.
 * It tracks products (sourced in CNY), orders across multiple sales platforms
 * (Instagram, GRAILED, in-person, website), and personal haul cash flows.
 * Analytics views in PostgreSQL power product/platform stats and time-series charts.</p>
 *
 * <p>The frontend (React + Vite) connects via {@code /api} proxy to this server on port 8080.</p>
 */
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}