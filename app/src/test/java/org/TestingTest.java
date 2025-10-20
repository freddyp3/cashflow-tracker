package org;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class TestingTest {
    
    @Test
    void firstTestingTestGradle() {
        int two = 2;
        int ans = two;
        ans = two * two;
        assertEquals(4, ans);
    }
}
