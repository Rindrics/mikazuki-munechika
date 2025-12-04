# ADR 0005: Do Not Use Event Sourcing (For Now)

## Status

Accepted

## Context

We need to decide on the data persistence strategy for the stock assessment web application. Event sourcing is a pattern where application state is stored as a sequence of events, rather than storing the current state directly.

The following considerations exist:

- The application needs to track changes for audit purposes (ADR 0004)
- We want to keep the initial implementation simple
- Development speed is a priority
- The developer do not have extensive experience with event sourcing
- We need to support complex queries and reporting
- We need to reproduce past stock assessment results

## Decision

Do not use event sourcing in the initial implementation. Use traditional CRUD operations with audit logging instead.

### Rationale

1. **Simplicity**
   - Traditional CRUD is simpler to understand and implement
   - Faster initial development
   - Easier for new team members to understand

2. **Query Complexity**
   - Stock assessment applications require complex queries and aggregations
   - Event sourcing requires rebuilding state from events for queries
   - Traditional database queries are more straightforward

3. **Audit Requirements**
   - Audit logging (ADR 0004) provides sufficient audit trail
   - We don't need full event sourcing for audit purposes
   - Audit logs can track what happened without storing all events as the source of truth

4. **Historical Data Requirements**
   - We need to reproduce past stock assessment results
     - However, this can be achieved by storing assessment results with a `year` column
   - No need for event replay - we can simply query historical results by year
   - Event sourcing would be overkill for this use case

5. **Team Experience**
   - Event sourcing has a learning curve
   - May slow down development if team is not familiar with the pattern
   - Traditional approach is more widely understood

6. **Current Requirements**
   - Current requirements don't necessitate event sourcing
   - Can be added later if needed
   - YAGNI (You Aren't Gonna Need It) principle applies

## Consequences

### Benefits

1. **Faster Development**
   - Simpler implementation
   - Less code to write and maintain
   - Faster time to market

2. **Easier Queries**
   - Direct database queries
   - Standard SQL operations
   - Better performance for read-heavy operations

3. **Lower Complexity**
   - Easier to understand and debug
   - Less infrastructure to manage
   - Simpler deployment

4. **Team Productivity**
   - Team can focus on business logic
   - Less time spent on infrastructure concerns
   - Easier onboarding for new team members

5. **Historical Data Access**
   - Past assessment results can be stored with a `year` column
   - Simple queries to retrieve historical data by year
   - No need for complex event replay mechanisms

### Drawbacks and Considerations

1. **Limited Event History**
   - We only store current state, not full event history
   - Audit logs provide some history, but not complete event stream
   - May need to reconstruct history from audit logs if needed

2. **State Reconstruction**
   - Cannot easily reconstruct past states
   - Would need to rely on audit logs or backups
   - However, for assessment results, storing by year is sufficient

3. **Event-Driven Architecture**
   - Cannot easily integrate with event-driven systems
   - Would need to add event publishing separately if needed
   - Less suitable for microservices architectures

4. **Future Migration**
   - If event sourcing is needed later, migration will be required
   - May require significant refactoring
   - However, audit logs can help with migration

### Alternatives Considered

1. **Full Event Sourcing**
   - Store all events as the source of truth
   - Rebuild state from events
   - Pros: Complete history, time travel, audit trail built-in
   - Cons: Complex queries, learning curve, more infrastructure
   - Decision: Not chosen due to complexity and current requirements

2. **Hybrid Approach**
   - Use event sourcing for some entities, CRUD for others
   - Pros: Flexibility, can use where it makes sense
   - Cons: Increased complexity, two patterns to maintain
   - Decision: Not chosen - adds complexity without clear benefit

3. **CQRS (Command Query Responsibility Segregation)**
   - Separate read and write models
   - Pros: Better performance, scalability
   - Cons: More complexity, eventual consistency concerns
   - Decision: Not chosen - overkill for current requirements

4. **Traditional CRUD with Audit Logging (Chosen)**
   - Standard database operations with audit trail
   - Store historical assessment results with `year` column for reproducibility
   - Pros: Simple, fast development, easy queries, straightforward historical data access
   - Cons: Limited event history, no time travel
   - Decision: Chosen - best fit for current requirements

## Future Considerations

If the following requirements emerge, we should reconsider event sourcing:

1. **Time Travel Requirements**
   - Need to view system state at any point in time (beyond year-based historical data)
   - Need to replay events to reconstruct state

2. **Complex Event Processing**
   - Need to process events in real-time
   - Need event-driven integrations

3. **High Write Volume**
   - Event sourcing can be more efficient for high write volumes
   - Better scalability for write-heavy workloads

4. **Distributed Systems**
   - Event sourcing works well with microservices
   - Better for event-driven architectures

5. **Regulatory Requirements**
   - If regulations require complete event history
   - If audit requirements become more stringent

## Migration Path (If Needed)

If event sourcing is needed in the future:

1. **Use Audit Logs**
   - Audit logs (ADR 0004) can serve as initial event stream
   - Can migrate audit logs to event store
   - Provides foundation for event sourcing

2. **Gradual Migration**
   - Start with new features using event sourcing
   - Keep existing CRUD operations
   - Gradually migrate as needed

3. **Event Publishing**
   - Add event publishing to existing CRUD operations
   - Build event store alongside existing database
   - Eventually migrate to event sourcing

## Related ADRs

- ADR 0002: Adopt Supabase Auth - Uses traditional database storage
- ADR 0004: Audit Logging - Provides audit trail without event sourcing
- ADR 0003: User Role and Stock Group Design - Uses traditional relational database design
