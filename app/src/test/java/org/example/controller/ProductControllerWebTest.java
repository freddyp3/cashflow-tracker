package org.example.controller;

import java.math.BigDecimal;

import org.example.entity.Product;
import org.example.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
class ProductControllerWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ProductService service;

    private static Product product(String name, String kind) {
        Product p = new Product();
        p.setProductId(1);
        p.setProductName(name);
        p.setCost(new BigDecimal("50"));
        p.setStockQuantity(1);
        p.setKind(kind);
        return p;
    }

    @Test
    void createWithPersonalKindRoundTrips() throws Exception {
        when(service.create(any())).thenReturn(product("My Old Hoodie", "personal"));

        mvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productName\":\"My Old Hoodie\",\"cost\":0,\"stockQuantity\":0,\"kind\":\"personal\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.kind").value("personal"));
    }

    @Test
    void createWithoutKindDefaultsToBusiness() throws Exception {
        when(service.create(any())).thenReturn(product("Penguin Shirt", "business"));

        mvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productName\":\"Penguin Shirt\",\"cost\":50,\"stockQuantity\":1}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.kind").value("business"));
    }

    @Test
    void createWithInvalidKindReturns400() throws Exception {
        when(service.create(any())).thenThrow(new IllegalArgumentException("Invalid product kind: other"));

        mvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productName\":\"Bad\",\"cost\":1,\"stockQuantity\":0,\"kind\":\"other\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid product kind: other"));
    }

    @Test
    void personalHaulsEndpointIsNotServed() throws Exception {
        mvc.perform(get("/api/personal-hauls"))
                .andExpect(status().isNotFound());
    }
}
