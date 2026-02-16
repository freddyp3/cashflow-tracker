package org.example.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * JPA entity mapped to the {@code personal_hauls} table.
 *
 * <p>Tracks personal clothing purchases and resale cash flows, separate from business orders.
 * The primary key is a database-generated timestamp ({@code DEFAULT now()}), so it is
 * not insertable or updatable from JPA. Inserts are handled via raw JDBC in
 * {@link org.example.service.PersonalHaulService}.</p>
 */
@Entity
@Table(name = "personal_hauls")
public class PersonalHaul {

    /** Database-generated timestamp (primary key). Not settable from application code. */
    @Id
    @Column(name = "entry_time", insertable = false, updatable = false)
    private OffsetDateTime entryTime;

    /** Cash flow direction: "income" or "expense". */
    @Column(name = "flow_type", nullable = false, length = 10)
    private String flowType;

    /** Dollar amount in CAD. */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /** Optional description of the haul entry. */
    private String note;

    public PersonalHaul() {}

    public OffsetDateTime getEntryTime() { return entryTime; }
    public void setEntryTime(OffsetDateTime entryTime) { this.entryTime = entryTime; }

    public String getFlowType() { return flowType; }
    public void setFlowType(String flowType) { this.flowType = flowType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
