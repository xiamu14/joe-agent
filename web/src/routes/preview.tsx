import { createFileRoute } from '@tanstack/react-router'
import { JoeExperience } from '../components/joe-experience'

export const Route = createFileRoute('/preview')({ component: JoeExperience })
