import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Select, SelectTrigger } from '@workspace/ui/components/select'
import { SearchIcon } from 'lucide-react'

export const RolesTable = () => {
  return (
    <div className="py-10">
      <div className="nut-all bg-input/30 border-y-2 p-3">
        <div className="bg-background rounded-lg border-2 border-dashed">
          <div className="flex items-center justify-between border-b-2 border-dashed p-4">
            <p className="text-lg">Open roles</p>
            <p className="text-muted-foreground text-sm">200 roles</p>
          </div>

          <div className="flex items-center gap-2 p-4">
            <InputGroup>
              <InputGroupButton>
                <SearchIcon />
              </InputGroupButton>
              <InputGroupInput placeholder="Search..." />
            </InputGroup>

            <Select>
              <SelectTrigger>Locations</SelectTrigger>
            </Select>
            <Select>
              <SelectTrigger>Department</SelectTrigger>
            </Select>
            <Select>
              <SelectTrigger>Newest</SelectTrigger>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
