package org.example.controller;

import java.math.BigDecimal;
import java.util.List;

import org.example.entity.Order;
import org.example.entity.OrderItem;
import org.example.entity.Product;
import org.example.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
class OrderControllerWebTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private OrderService service;

    @Test
    void getAllReturnsJsonArray() throws Exception {
        Product product = new Product();
        product.setProductId(1);
        product.setProductName("Penguin Shirt");
        product.setCost(new BigDecimal("50"));

        OrderItem item = new OrderItem();
        item.setOrderItemId(1);
        item.setProduct(product);
        item.setItemPaid(new BigDecimal("50"));

        Order order = new Order();
        order.setOrderId(1);
        order.setPlatform("Grailed");
        order.setRevenue(new BigDecimal("100"));
        order.setItems(List.of(item));
        item.setOrder(order);

        when(service.findAll(null)).thenReturn(List.of(order));

        mvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].platform").value("Grailed"))
                .andExpect(jsonPath("$[0].items[0].productName").value("Penguin Shirt"));
    }
}
