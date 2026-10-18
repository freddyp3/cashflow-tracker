package org.example.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import org.example.repository.StatsRepository;
import org.example.service.StatsCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StatsController.class)
class StatsControllerWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private StatsRepository stats;

    @MockitoBean
    private StatsCache cache;

    @BeforeEach
    void passThroughCache() {
        when(cache.cached(anyString(), any(), any()))
                .thenAnswer(inv -> ((Supplier<?>) inv.getArgument(2)).get());
    }

    @Test
    void platformStatsReturnsMockedList() throws Exception {
        List<Map<String, Object>> mocked = List.of(Map.of(
                "platform", "Grailed",
                "platform_revenue", new BigDecimal("100"),
                "platform_profit", new BigDecimal("40")));
        when(stats.getPlatformStats()).thenReturn(mocked);

        mvc.perform(get("/api/stats/platforms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].platform").value("Grailed"))
                .andExpect(jsonPath("$[0].platform_revenue").value(100));
    }
}
