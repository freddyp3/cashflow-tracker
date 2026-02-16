package org.example.controller;

import org.example.service.CurrencyService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * REST controller for currency exchange rates.
 *
 * <p>Endpoint: {@code GET /api/currency/rates?from=USD} returns the live
 * exchange rate to CAD as {@code {"from":"USD","to":"CAD","rate":1.35}}.</p>
 */
@RestController
@RequestMapping("/api/currency")
public class CurrencyController {

    private final CurrencyService service;

    public CurrencyController(CurrencyService service) {
        this.service = service;
    }

    @GetMapping("/rates")
    public Map<String, Object> getRate(@RequestParam String from) {
        BigDecimal rate = service.getRate(from);
        return Map.of(
                "from", from.toUpperCase(),
                "to", "CAD",
                "rate", rate
        );
    }
}
