-- Drop existing permissive policies that use 'true'
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can create preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

-- Create proper RLS policies for conversations using auth.uid()
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (anonymous_id = auth.uid());

CREATE POLICY "Users can create their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (anonymous_id = auth.uid());

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (anonymous_id = auth.uid());

CREATE POLICY "Users can delete their own conversations" 
ON public.conversations 
FOR DELETE 
USING (anonymous_id = auth.uid());

-- Create proper RLS policies for messages (join through conversations)
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.anonymous_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.anonymous_id = auth.uid()
  )
);

-- Create proper RLS policies for user_preferences using auth.uid()
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (anonymous_id = auth.uid());

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (anonymous_id = auth.uid());

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (anonymous_id = auth.uid());

CREATE POLICY "Users can delete their own preferences" 
ON public.user_preferences 
FOR DELETE 
USING (anonymous_id = auth.uid());