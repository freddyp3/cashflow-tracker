package org.example.controller;

import java.util.List;

import org.example.repository.StatsRepository;
import org.example.service.PlatformService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MetaController.class)
class MetaControllerWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private PlatformService platformService;

    @MockitoBean
    private StatsRepository stats;

    @Test
    void platformsReturnsStubbedListAsJsonArray() throws Exception {
        when(platformService.allPlatforms())
                .thenReturn(List.of("Grailed", "Depop", "eBay", "Vinted"));

        mvc.perform(get("/api/meta/platforms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0]").value("Grailed"))
                .andExpect(jsonPath("$[1]").value("Depop"))
                .andExpect(jsonPath("$[2]").value("eBay"))
                .andExpect(jsonPath("$[3]").value("Vinted"))
                .andExpect(jsonPath("$.length()").value(4));
    }
}
