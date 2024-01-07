# [[Project Zebra]] Ahead of Schedule
The team is doing _great!_
* The project is ahead by **three weeks**.
	* The client is likely to be impressed. We should be prepared for requests for follow-up work. Might need to be a new contract.
	* We need to plan a celebratory lunch.
* We should be careful when considering the workload of the next project. Coming in ahead of schedule now does not mean we will do so again.

## Tracking can be Improved
We can take this opportunity to improve our tracking data. A rough sketch:

```typescript
type TimeTrackingEvent = {
	name: string
	start: Date
	end: Date // Or just a duration?
	participants: User[] // Support multiple users
	ticket: string // Theoreticaly the ticket's GUID
}
```